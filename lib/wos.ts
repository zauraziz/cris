// Web of Science Starter API klienti (PULSUZ plan).
// Strategiya: tədqiqatçının DOI-lərini ORCID-dən götür → WoS-da DOI üzrə axtar.
// DOI unikal olduğu üçün yanlış müəllifə aid etmə riski yoxdur.
//
// QEYD: WoS pulsuz planının sitat (times-cited) saylarını qaytarıb-qaytarmaması
// abunəlikdən asılı ola bilər. Kod hər iki halı dəstəkləyir: sitat varsa istifadə edir,
// yoxdursa 0 saxlayır (yalnız publikasiya sayı göstərilir).

const WOS_BASE = "https://api.clarivate.com/apis/wos-starter/v1/documents";
const ORCID_BASE = "https://pub.orcid.org/v3.0";

export function wosConfigured(): boolean {
  return !!process.env.WOS_API_KEY;
}

export type WosStats = {
  configured: boolean; // API açarı varmı
  found: boolean; // WoS-da ən azı 1 sənəd tapıldımı
  works: number; // WoS-da indekslənmiş əsər sayı
  citations: number; // cəmi WoS sitatı (pulsuz planda mövcud olmaya bilər)
  hIndex: number; // WoS əsərlərindən hesablanmış h-indeks
  hasCitations: boolean; // cavabda sitat sayı gəldimi
};

const EMPTY: WosStats = {
  configured: false,
  found: false,
  works: 0,
  citations: 0,
  hIndex: 0,
  hasCitations: false,
};

// DOI-ni normallaşdır: URL prefiksini sil, kiçik hərf
function normalizeDoi(raw: string): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  d = d.replace(/^doi:/, "");
  return d.startsWith("10.") ? d : null;
}

// ORCID profilindən bütün DOI-ləri çıxar
export async function fetchOrcidDois(orcid: string): Promise<string[]> {
  try {
    const res = await fetch(`${ORCID_BASE}/${encodeURIComponent(orcid)}/works`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const dois = new Set<string>();
    for (const group of data?.group || []) {
      const ids = group?.["work-summary"]?.[0]?.["external-ids"]?.["external-id"] || [];
      for (const id of ids) {
        if (id?.["external-id-type"] === "doi") {
          const norm = normalizeDoi(id?.["external-id-value"] || "");
          if (norm) dois.add(norm);
        }
      }
    }
    return Array.from(dois);
  } catch {
    return [];
  }
}

function computeHIndex(citationsList: number[]): number {
  const sorted = [...citationsList].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}

// WoS-da DOI dəstəsi üzrə axtarış (≤50 DOI bir sorğuda)
export async function fetchWosByDois(dois: string[]): Promise<WosStats> {
  const key = process.env.WOS_API_KEY;
  if (!key) return { ...EMPTY, configured: false };
  if (!dois.length) return { ...EMPTY, configured: true };

  try {
    // İlk 50 DOI (pulsuz plan limitini qorumaq üçün tək sorğu)
    const batch = dois.slice(0, 50);
    const q = `DO=(${batch.join(" OR ")})`;
    const params = new URLSearchParams({ db: "WOS", q, limit: "50", page: "1" });
    const res = await fetch(`${WOS_BASE}?${params.toString()}`, {
      headers: { "X-ApiKey": key, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ...EMPTY, configured: true };
    const data = await res.json();
    const hits: any[] = data?.hits || [];

    let hasCitations = false;
    const cits = hits.map((h) => {
      const wos = (h?.citations || []).find((c: any) => c?.db === "WOS");
      if (wos && typeof wos.count === "number") {
        hasCitations = true;
        return wos.count as number;
      }
      return 0;
    });

    const works = hits.length;
    const citations = cits.reduce((s, c) => s + c, 0);
    return {
      configured: true,
      found: works > 0,
      works,
      citations,
      hIndex: computeHIndex(cits),
      hasCitations,
    };
  } catch {
    return { ...EMPTY, configured: true };
  }
}

// Rahatlıq üçün: ORCID → DOI-lər → WoS göstəriciləri
export async function fetchWosForOrcid(orcid: string): Promise<WosStats> {
  if (!wosConfigured()) return { ...EMPTY, configured: false };
  const dois = await fetchOrcidDois(orcid);
  if (!dois.length) return { ...EMPTY, configured: true };
  return fetchWosByDois(dois);
}
