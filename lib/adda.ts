// ============================================================
//  ADDA strukturu — NÜMUNƏ məlumatlardır.
//  Real fakültə/kafedra adları ilə əvəz edin.
//  Bu faylı dəyişmək kifayətdir; qalan kod avtomatik uyğunlaşır.
// ============================================================

export const ADDA_STRUCTURE: Record<string, string[]> = {
  "Dəniz Naviqasiyası fakültəsi": [
    "Gəmi naviqasiyası kafedrası",
    "Gəmilərin idarə olunması kafedrası",
    "Dəniz təhlükəsizliyi və mühafizəsi kafedrası",
  ],
  "Gəmi Energetika fakültəsi": [
    "Gəmi energetik qurğuları kafedrası",
    "Gəmi elektrik avadanlığı və avtomatika kafedrası",
    "Soyuducu və ventilyasiya qurğuları kafedrası",
  ],
  "Hidrotexnika və Liman fakültəsi": [
    "Liman və terminal qurğuları kafedrası",
    "Hidrotexniki qurğular kafedrası",
    "Logistika və dəniz nəqliyyatı kafedrası",
  ],
  "Humanitar fakültə": [
    "Xarici dillər kafedrası",
    "İctimai fənlər kafedrası",
    "Riyaziyyat və təbiət elmləri kafedrası",
  ],
};

export const POSITIONS = [
  "Professor",
  "Dosent",
  "Baş müəllim",
  "Müəllim",
  "Assistent",
  "Elmi işçi",
];

// ADDA korporativ e-poçt domen(lər)i. Mühit dəyişəni ilə üstələnə bilər.
export const EMAIL_DOMAINS = (
  process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "adda.edu.az"
)
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isValidAddaEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return EMAIL_DOMAINS.some(
    (d) => e.endsWith("@" + d) && e.length > d.length + 1
  );
}
