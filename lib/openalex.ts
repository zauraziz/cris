// OpenAlex API klienti — ORCID əsasında elmmetrik göstəricilər və əsərlər.
// Pulsuz və açıqdır; lisenziya tələb etmir.

const OPENALEX_BASE = "https://api.openalex.org";
const MAILTO = process.env.OPENALEX_MAILTO || "info@adda.edu.az";

export type YearCount = { year: number; works: number; citations: number };

export type OpenAlexStats = {
  found: boolean;
  openalexId: string | null;
  worksCount: number;
  citations: number;
  hIndex: number;
  i10Index: number;
  name: string | null;
  countsByYear: YearCount[];
};

const EMPTY: OpenAlexStats = {
  found: false,
  openalexId: null,
  worksCount: 0,
  citations: 0,
  hIndex: 0,
  i10Index: 0,
  name: null,
  countsByYear: [],
};

export async function fetchOpenAlexByOrcid(orcid: string): Promise<OpenAlexStats> {
  try {
    const url = `${OPENALEX_BASE}/authors?filter=orcid:${encodeURIComponent(
      orcid
    )}&per-page=1&mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    const a = data?.results?.[0];
    if (!a) return EMPTY;
    const countsByYear: YearCount[] = (a.counts_by_year || [])
      .map((c: any) => ({ year: c.year, works: c.works_count ?? 0, citations: c.cited_by_count ?? 0 }))
      .sort((x: YearCount, y: YearCount) => x.year - y.year);
    return {
      found: true,
      openalexId: a.id || null,
      worksCount: a.works_count ?? 0,
      citations: a.cited_by_count ?? 0,
      hIndex: a.summary_stats?.h_index ?? 0,
      i10Index: a.summary_stats?.i10_index ?? 0,
      name: a.display_name || null,
      countsByYear,
    };
  } catch {
    return EMPTY;
  }
}

export type OaWork = {
  id: string;
  title: string;
  year: number | null;
  citations: number;
  type: string | null;
  venue: string | null;
  doi: string | null;
  isOA: boolean;
  authors: number;
};

export async function fetchOpenAlexWorks(orcid: string, perPage = 50): Promise<OaWork[]> {
  try {
    const url = `${OPENALEX_BASE}/works?filter=author.orcid:${encodeURIComponent(
      orcid
    )}&per-page=${perPage}&sort=publication_date:desc&mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []).map((w: any) => ({
      id: w.id,
      title: w.display_name || w.title || "Başlıqsız",
      year: w.publication_year ?? null,
      citations: w.cited_by_count ?? 0,
      type: w.type ?? null,
      venue: w.primary_location?.source?.display_name ?? null,
      doi: w.doi ?? null,
      isOA: !!w.open_access?.is_oa,
      authors: (w.authorships || []).length,
    }));
  } catch {
    return [];
  }
}

// ===== Karyera xəritəsi üçün genişləndirilmiş profil =====
export type ResearchArea = { name: string; value: number };
export type Affiliation = { name: string; country: string | null; startYear: number | null; endYear: number | null };
export type OpenAlexProfile = OpenAlexStats & { topics: ResearchArea[]; affiliations: Affiliation[] };

export async function fetchOpenAlexProfile(orcid: string): Promise<OpenAlexProfile> {
  const base: OpenAlexProfile = { ...EMPTY, topics: [], affiliations: [] };
  try {
    const url = `${OPENALEX_BASE}/authors?filter=orcid:${encodeURIComponent(
      orcid
    )}&per-page=1&mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return base;
    const data = await res.json();
    const a = data?.results?.[0];
    if (!a) return base;

    const countsByYear: YearCount[] = (a.counts_by_year || [])
      .map((c: any) => ({ year: c.year, works: c.works_count ?? 0, citations: c.cited_by_count ?? 0 }))
      .sort((x: YearCount, y: YearCount) => x.year - y.year);

    // Tədqiqat sahələri: əvvəlcə topics, yoxdursa x_concepts
    let topics: ResearchArea[] = (a.topics || [])
      .map((t: any) => ({ name: t.display_name, value: t.count ?? 0 }))
      .filter((t: ResearchArea) => t.name);
    if (!topics.length && Array.isArray(a.x_concepts)) {
      topics = a.x_concepts
        .filter((c: any) => (c.score ?? 0) > 0)
        .map((c: any) => ({ name: c.display_name, value: Math.round(c.score) }));
    }
    topics = topics.slice(0, 6);

    // Mənsubiyyət tarixçəsi
    const affiliations: Affiliation[] = (a.affiliations || [])
      .map((af: any) => {
        const ys: number[] = (af.years || []).filter((y: any) => typeof y === "number");
        return {
          name: af.institution?.display_name || "",
          country: af.institution?.country_code || null,
          startYear: ys.length ? Math.min(...ys) : null,
          endYear: ys.length ? Math.max(...ys) : null,
        };
      })
      .filter((x: Affiliation) => x.name);
    affiliations.sort((p, q) => (q.endYear || 0) - (p.endYear || 0));

    return {
      found: true,
      openalexId: a.id || null,
      worksCount: a.works_count ?? 0,
      citations: a.cited_by_count ?? 0,
      hIndex: a.summary_stats?.h_index ?? 0,
      i10Index: a.summary_stats?.i10_index ?? 0,
      name: a.display_name || null,
      countsByYear,
      topics,
      affiliations: affiliations.slice(0, 6),
    };
  } catch {
    return base;
  }
}

// ===== İnstitusional profil (ROR üzrə) =====
// Webometrics şəffaflıq göstəricisi OpenAlex-i ROR ilə oxuduğundan,
// bu, ADDA-nın açıq elmi "izini" göstərir.
export type InstitutionProfile = {
  found: boolean;
  openalexId: string | null;
  displayName: string | null;
  worksCount: number;
  citations: number;
  hIndex: number;
  i10Index: number;
  homepage: string | null;
  countsByYear: YearCount[];
};

export async function fetchInstitutionByRor(ror: string): Promise<InstitutionProfile> {
  const empty: InstitutionProfile = {
    found: false, openalexId: null, displayName: null,
    worksCount: 0, citations: 0, hIndex: 0, i10Index: 0,
    homepage: null, countsByYear: [],
  };
  try {
    const url = `${OPENALEX_BASE}/institutions/ror:${encodeURIComponent(ror)}?mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return empty;
    const i = await res.json();
    if (!i || !i.id) return empty;
    const countsByYear: YearCount[] = (i.counts_by_year || [])
      .map((c: any) => ({ year: c.year, works: c.works_count ?? 0, citations: c.cited_by_count ?? 0 }))
      .sort((a: YearCount, b: YearCount) => a.year - b.year);
    return {
      found: true,
      openalexId: i.id || null,
      displayName: i.display_name || null,
      worksCount: i.works_count ?? 0,
      citations: i.cited_by_count ?? 0,
      hIndex: i.summary_stats?.h_index ?? 0,
      i10Index: i.summary_stats?.i10_index ?? 0,
      homepage: i.homepage_url || null,
      countsByYear,
    };
  } catch {
    return empty;
  }
}

// ===== İnstitut müəllifləri (harvest üçün) =====
export type InstAuthor = {
  openalexId: string;
  name: string;
  orcid: string | null;
  worksCount: number;
  citations: number;
  hIndex: number;
  i10Index: number;
};

// Verilmiş OpenAlex institut ID-si (I...) üzrə müəllifləri gətirir (son mənsubiyyət).
export async function fetchInstitutionAuthors(institutionId: string, limit = 200): Promise<InstAuthor[]> {
  const iid = institutionId.replace("https://openalex.org/", "");
  const out: InstAuthor[] = [];
  try {
    let cursor = "*";
    while (out.length < limit && cursor) {
      const url = `${OPENALEX_BASE}/authors?filter=last_known_institutions.id:${iid}` +
        `&per-page=200&sort=works_count:desc&cursor=${encodeURIComponent(cursor)}&mailto=${encodeURIComponent(MAILTO)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) break;
      const data = await res.json();
      for (const a of data?.results || []) {
        out.push({
          openalexId: a.id || "",
          name: a.display_name || "",
          orcid: a.orcid ? String(a.orcid).replace("https://orcid.org/", "") : null,
          worksCount: a.works_count ?? 0,
          citations: a.cited_by_count ?? 0,
          hIndex: a.summary_stats?.h_index ?? 0,
          i10Index: a.summary_stats?.i10_index ?? 0,
        });
      }
      cursor = data?.meta?.next_cursor || "";
      if (!data?.results?.length) break;
    }
  } catch {
    /* ignore */
  }
  return out.filter((a) => a.openalexId && a.name).slice(0, limit);
}

// ===== Main page üçün: həmmüəllif ölkələri və son nəşrlər =====
export type CoCountry = { code: string; name: string; count: number };

// İnstitut işlərində iştirak edən ölkələr (beynəlxalq əməkdaşlıq xəritəsi üçün)
// Ölkə kodu → Azərbaycanca ad (xəritə və siyahı üçün)
const COUNTRY_AZ: Record<string, string> = {
  TR: "Türkiyə", RU: "Rusiya", IR: "İran", UA: "Ukrayna", GE: "Gürcüstan", KZ: "Qazaxıstan",
  US: "ABŞ", GB: "Böyük Britaniya", DE: "Almaniya", FR: "Fransa", IT: "İtaliya", ES: "İspaniya",
  PL: "Polşa", CN: "Çin", IN: "Hindistan", JP: "Yaponiya", KR: "Cənubi Koreya", CA: "Kanada",
  BR: "Braziliya", AU: "Avstraliya", NL: "Niderland", BE: "Belçika", CH: "İsveçrə", AT: "Avstriya",
  SE: "İsveç", NO: "Norveç", FI: "Finlandiya", DK: "Danimarka", CZ: "Çexiya", SK: "Slovakiya",
  RO: "Rumıniya", BG: "Bolqarıstan", GR: "Yunanıstan", PT: "Portuqaliya", IE: "İrlandiya",
  HU: "Macarıstan", RS: "Serbiya", HR: "Xorvatiya", SI: "Sloveniya", LT: "Litva", LV: "Latviya",
  EE: "Estoniya", BY: "Belarus", MD: "Moldova", AE: "BƏƏ", SA: "Səudiyyə Ərəbistanı", EG: "Misir",
  IL: "İsrail", QA: "Qətər", KW: "Küveyt", PK: "Pakistan", BD: "Banqladeş", ID: "İndoneziya",
  MY: "Malayziya", TH: "Tayland", VN: "Vyetnam", PH: "Filippin", SG: "Sinqapur", ZA: "CAR",
  NG: "Nigeriya", MX: "Meksika", AR: "Argentina", CL: "Çili", NZ: "Yeni Zelandiya", UZ: "Özbəkistan",
  TM: "Türkmənistan", KG: "Qırğızıstan", TJ: "Tacikistan", MA: "Mərakeş", DZ: "Əlcəzair", TN: "Tunis",
  CY: "Kipr", MT: "Malta", LU: "Lüksemburq", JO: "İordaniya", LB: "Livan", IQ: "İraq", SY: "Suriya",
};

export async function fetchInstitutionCoauthorCountries(institutionId: string): Promise<CoCountry[]> {
  const iid = institutionId.replace("https://openalex.org/", "");
  const counts: Record<string, number> = {};
  try {
    // İşləri birbaşa gəzib ölkələri topla (group_by-a güvənmirik).
    // Hər iş üçün authorships.countries + institutions.country_code birləşdirilir, iş başına 1 dəfə sayılır.
    let cursor: string | null = "*";
    let pages = 0;
    while (cursor && pages < 6) {
      const url = `${OPENALEX_BASE}/works?filter=institutions.id:${iid}` +
        `&select=authorships&per-page=200&cursor=${encodeURIComponent(cursor)}&mailto=${encodeURIComponent(MAILTO)}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) break;
      const data: any = await res.json();
      const results: any[] = data?.results || [];
      for (const w of results) {
        const set = new Set<string>();
        for (const a of (w.authorships || [])) {
          for (const c of (a.countries || [])) if (c) set.add(String(c).toUpperCase());
          for (const inst of (a.institutions || [])) if (inst?.country_code) set.add(String(inst.country_code).toUpperCase());
        }
        set.forEach((code) => { counts[code] = (counts[code] || 0) + 1; });
      }
      cursor = data?.meta?.next_cursor || null;
      pages++;
      if (results.length === 0) break;
    }
  } catch {
    return [];
  }
  return Object.entries(counts)
    .filter(([code]) => code && code !== "AZ")
    .map(([code, count]) => ({ code, name: COUNTRY_AZ[code] || code, count }))
    .sort((a, b) => b.count - a.count);
}

export type RecentWork = { title: string; year: number | null; venue: string | null; doi: string | null; type: string | null; authors: string };

export async function fetchInstitutionRecentWorks(institutionId: string, n = 6): Promise<RecentWork[]> {
  const iid = institutionId.replace("https://openalex.org/", "");
  try {
    const url = `${OPENALEX_BASE}/works?filter=institutions.id:${iid}` +
      `&sort=publication_date:desc&per-page=${n}&mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []).map((w: any) => {
      const auths = (w.authorships || []).slice(0, 3).map((a: any) => a.author?.display_name).filter(Boolean);
      const more = (w.authorships || []).length > 3 ? " və b." : "";
      return {
        title: w.display_name || w.title || "(başlıqsız)",
        year: w.publication_year || null,
        venue: w.primary_location?.source?.display_name || null,
        doi: w.doi || null,
        type: w.type || null,
        authors: auths.join(", ") + more,
      };
    });
  } catch {
    return [];
  }
}
