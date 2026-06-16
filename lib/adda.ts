// ============================================================
//  ADDA strukturu — real fakültə və kafedra adları.
//  Dəyişmək üçün yalnız bu obyekti redaktə edin; qalan kod
//  (forma, validasiya, dashboard) avtomatik uyğunlaşır.
// ============================================================

export const ADDA_STRUCTURE: Record<string, string[]> = {
  "Gəmi Sürücülüyü fakültəsi": [
    "Dəniz naviqasiyası",
    "Gəmi sürücülüyü",
    "Gəmiqayırma və gəmi təmiri",
    "Humanitar fənnlər",
    "İngilis dili",
  ],
  "Gəmi Mexanikası və Elektromexanikası fakültəsi": [
    "Gəmi energetik qurğuları",
    "Gəmi elektroavtomatikası",
    "Tətbiqi mexanika",
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

// ADDA-nın rəsmi identifikatorları (ROR registrindən təsdiqlənib)
export const ADDA_ROR = "01znwv148";
export const ADDA_ROR_URL = "https://ror.org/01znwv148";
