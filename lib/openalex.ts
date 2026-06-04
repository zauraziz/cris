// OpenAlex API klienti — ORCID əsasında elmmetrik göstəriciləri çəkir.
// OpenAlex pulsuz və açıqdır; h-indeks, sitat sayı və publikasiya sayını
// summary_stats sahəsində birbaşa təqdim edir. Lisenziya tələb etmir.

const OPENALEX_BASE = "https://api.openalex.org";
// "polite pool" üçün e-poçt (sürətli və etibarlı cavab). Mühit dəyişəni ilə üstələnə bilər.
const MAILTO = process.env.OPENALEX_MAILTO || "info@adda.edu.az";

export type OpenAlexStats = {
  found: boolean;
  openalexId: string | null;
  worksCount: number;
  citations: number;
  hIndex: number;
  i10Index: number;
  name: string | null;
};

const EMPTY: OpenAlexStats = {
  found: false,
  openalexId: null,
  worksCount: 0,
  citations: 0,
  hIndex: 0,
  i10Index: 0,
  name: null,
};

export async function fetchOpenAlexByOrcid(orcid: string): Promise<OpenAlexStats> {
  try {
    const url = `${OPENALEX_BASE}/authors?filter=orcid:${encodeURIComponent(
      orcid
    )}&per-page=1&mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    const a = data?.results?.[0];
    if (!a) return EMPTY;
    return {
      found: true,
      openalexId: a.id || null,
      worksCount: a.works_count ?? 0,
      citations: a.cited_by_count ?? 0,
      hIndex: a.summary_stats?.h_index ?? 0,
      i10Index: a.summary_stats?.i10_index ?? 0,
      name: a.display_name || null,
    };
  } catch {
    return EMPTY;
  }
}
