// ORCID public API-dən tədqiqatçının əsər siyahısını gətirir.
// OpenAlex bir ORCID-i tanımadıqda publikasiyaları göstərmək üçün istifadə olunur.

const ORCID_BASE = "https://pub.orcid.org/v3.0";

export type OrcidWork = {
  title: string;
  year: number | null;
  journal: string | null;
  doi: string | null;
  type: string | null;
  url: string | null;
};

export async function fetchOrcidWorks(orcid: string): Promise<OrcidWork[]> {
  try {
    const res = await fetch(`${ORCID_BASE}/${encodeURIComponent(orcid)}/works`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const works: OrcidWork[] = [];
    for (const g of data?.group || []) {
      const s = g?.["work-summary"]?.[0];
      if (!s) continue;
      const title = s?.title?.title?.value || null;
      if (!title) continue;
      const yRaw = s?.["publication-date"]?.year?.value;
      const year = yRaw ? parseInt(yRaw, 10) : null;
      const journal = s?.["journal-title"]?.value || null;
      const type = s?.type || null;
      let doi: string | null = null;
      for (const id of s?.["external-ids"]?.["external-id"] || []) {
        if (id?.["external-id-type"] === "doi") {
          doi = String(id["external-id-value"] || "")
            .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
            .toLowerCase();
          break;
        }
      }
      const url = doi ? `https://doi.org/${doi}` : s?.url?.value || null;
      works.push({
        title,
        year: Number.isFinite(year as number) ? (year as number) : null,
        journal,
        doi,
        type,
        url,
      });
    }
    works.sort((a, b) => (b.year || 0) - (a.year || 0));
    return works.slice(0, 60);
  } catch {
    return [];
  }
}
