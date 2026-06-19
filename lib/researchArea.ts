// #5 — əl ilə daxil edilən tədqiqat sahəsini OpenAlex taksonomiyası ilə uyğunlaşdırır.

const OA = "https://api.openalex.org";
const MAILTO = "info@adda.edu.az";

export type AreaSuggestion = { name: string; field: string } | null;

// Tədqiqat sahələri profil daxilində JSON massiv kimi saxlanır: [{id, name}, ...]
// id boşdursa → əl ilə (sərbəst) daxil edilmiş, standartlaşdırılmamış sahə.
export function parseAreas(raw: string | null | undefined): { id: string; name: string }[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: any) => ({ id: String(x?.id ?? ""), name: String(x?.name ?? "").trim() }))
      .filter((a) => a.name);
  } catch {
    return [];
  }
}

export function customAreaNames(raw: string | null | undefined): string[] {
  return parseAreas(raw).filter((a) => !a.id).map((a) => a.name);
}

// OpenAlex topics axtarışı ilə ən yaxın standart sahəni tap.
export async function suggestArea(term: string): Promise<AreaSuggestion> {
  const q = (term || "").trim();
  if (q.length < 2) return null;
  try {
    const res = await fetch(
      `${OA}/topics?search=${encodeURIComponent(q)}&per-page=1&mailto=${encodeURIComponent(MAILTO)}`,
      { next: { revalidate: 604800 } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const top = d?.results?.[0];
    if (!top || !top.display_name) return null;
    const name = String(top.display_name);
    // Onsuz da eyni addırsa (yalnız böyük/kiçik hərf fərqi) tövsiyəyə ehtiyac yoxdur
    if (name.toLowerCase() === q.toLowerCase()) return null;
    const field = top.field?.display_name || top.subfield?.display_name || "";
    return { name, field };
  } catch {
    return null;
  }
}
