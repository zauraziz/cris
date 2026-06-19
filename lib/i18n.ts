import { cookies } from "next/headers";

export const LOCALES = ["az", "en", "ru", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "az";

export const LOCALE_NAMES: Record<Locale, string> = {
  az: "Azərbaycanca",
  en: "English",
  ru: "Русский",
  tr: "Türkçe",
};

export type Announcement = { tag: string; title: string; text: string; date: string };
export type Dict = {
  brandSub: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSub: string;
  ctaCatalog: string;
  ctaLogin: string;
  secStats: string;
  statResearchers: string;
  statPubs: string;
  statCitations: string;
  statHindex: string;
  statCountries: string;
  statFaculties: string;
  secCollab: string;
  secCollabSub: string;
  secRecent: string;
  secAnnounce: string;
  footerTag: string;
  loadingPubs: string;
  announcements: Announcement[];
};

const DICT: Record<Locale, Dict> = {
  az: {
    brandSub: "Cari Tədqiqat İnformasiya Sistemi (CRIS)",
    heroEyebrow: "Azərbaycan Dövlət Dəniz Akademiyası",
    heroTitle: "Akademiyanın elmi nüfuzu — bir platformada",
    heroSub: "Tədqiqatçı profilləri, beynəlxalq göstəricilər və açıq elmi məlumat — Current Research Information System.",
    ctaCatalog: "Tədqiqatçı kataloquna bax",
    ctaLogin: "Sistemə daxil ol",
    secStats: "Statistika",
    statResearchers: "Tədqiqatçı",
    statPubs: "Nəşr",
    statCitations: "İstinad (sitat)",
    statHindex: "h-indeks",
    statCountries: "Əməkdaşlıq ölkəsi",
    statFaculties: "Fakültə",
    secCollab: "Beynəlxalq əməkdaşlıqlar",
    secCollabSub: "Akademiya tədqiqatçılarının nəşrlərində həmmüəllif olduqları ölkələr (OpenAlex məlumatları əsasında).",
    secRecent: "Son nəşrlər",
    secAnnounce: "Elanlar",
    footerTag: "Açıq mənbə infrastrukturu: ORCID · OpenAlex · Crossref · Bakı 2026",
    loadingPubs: "Nəşrlər yüklənir...",
    announcements: [
      { tag: "Çağırış", title: "ORCID profilinizi gücləndirin", text: "Əsərlərinizi ORCID-ə əlavə edin və mənsubiyyət olaraq ADDA-nı göstərin — hər düzgün qeyd Akademiyanın beynəlxalq görünürlüyünü artırır.", date: "Davam edir" },
      { tag: "Yenilik", title: "Tədqiqatçı kataloqu açıldı", text: "Akademiyanın elmi icması artıq ictimai kataloqda — sahə, kafedra və göstəricilər üzrə axtarış mümkündür.", date: "Yeni" },
      { tag: "Strategiya", title: "Webometrics-ə hazırlıq", text: "Portal açıq elmi infrastruktur (OpenAlex · ROR · ORCID) üzərində qurulub — bu, beynəlxalq reytinqin yeni metodologiyası ilə uyğundur.", date: "2026" },
    ],
  },
  en: {
    brandSub: "Current Research Information System (CRIS)",
    heroEyebrow: "Azerbaijan State Marine Academy",
    heroTitle: "The academy's scientific reputation — on one platform",
    heroSub: "Researcher profiles, international metrics and open research information — Current Research Information System.",
    ctaCatalog: "Browse researcher catalogue",
    ctaLogin: "Sign in",
    secStats: "Statistics",
    statResearchers: "Researchers",
    statPubs: "Publications",
    statCitations: "Citations",
    statHindex: "h-index",
    statCountries: "Collaboration countries",
    statFaculties: "Faculties",
    secCollab: "International collaborations",
    secCollabSub: "Countries co-authored in the academy researchers' publications (based on OpenAlex data).",
    secRecent: "Latest publications",
    secAnnounce: "Announcements",
    footerTag: "Open infrastructure: ORCID · OpenAlex · Crossref · Baku 2026",
    loadingPubs: "Loading publications...",
    announcements: [
      { tag: "Call", title: "Strengthen your ORCID profile", text: "Add your works to ORCID and list ADDA as your affiliation — every correct record boosts the Academy's international visibility.", date: "Ongoing" },
      { tag: "News", title: "Researcher catalogue launched", text: "The Academy's research community is now in a public catalogue — searchable by field, department and metrics.", date: "New" },
      { tag: "Strategy", title: "Preparing for Webometrics", text: "The portal is built on open research infrastructure (OpenAlex · ROR · ORCID) — aligned with the new methodology of international rankings.", date: "2026" },
    ],
  },
  ru: {
    brandSub: "Текущая исследовательская информационная система (CRIS)",
    heroEyebrow: "Азербайджанская Государственная Морская Академия",
    heroTitle: "Научная репутация академии — на одной платформе",
    heroSub: "Профили исследователей, международные показатели и открытые научные данные — Current Research Information System.",
    ctaCatalog: "Каталог исследователей",
    ctaLogin: "Войти в систему",
    secStats: "Статистика",
    statResearchers: "Исследователи",
    statPubs: "Публикации",
    statCitations: "Цитирования",
    statHindex: "h-индекс",
    statCountries: "Страны сотрудничества",
    statFaculties: "Факультеты",
    secCollab: "Международное сотрудничество",
    secCollabSub: "Страны-соавторы в публикациях исследователей академии (по данным OpenAlex).",
    secRecent: "Последние публикации",
    secAnnounce: "Объявления",
    footerTag: "Открытая инфраструктура: ORCID · OpenAlex · Crossref · Баку 2026",
    loadingPubs: "Загрузка публикаций...",
    announcements: [
      { tag: "Призыв", title: "Усильте свой профиль ORCID", text: "Добавьте свои работы в ORCID и укажите ADDA как место работы — каждая правильная запись повышает международную видимость Академии.", date: "Постоянно" },
      { tag: "Новость", title: "Открыт каталог исследователей", text: "Научное сообщество Академии теперь в публичном каталоге — поиск по области, кафедре и показателям.", date: "Новое" },
      { tag: "Стратегия", title: "Подготовка к Webometrics", text: "Портал построен на открытой научной инфраструктуре (OpenAlex · ROR · ORCID) — в соответствии с новой методологией международных рейтингов.", date: "2026" },
    ],
  },
  tr: {
    brandSub: "Güncel Araştırma Bilgi Sistemi (CRIS)",
    heroEyebrow: "Azerbaycan Devlet Deniz Akademisi",
    heroTitle: "Akademinin bilimsel itibarı — tek platformda",
    heroSub: "Araştırmacı profilleri, uluslararası göstergeler ve açık araştırma bilgisi — Current Research Information System.",
    ctaCatalog: "Araştırmacı kataloğuna göz at",
    ctaLogin: "Sisteme giriş",
    secStats: "İstatistikler",
    statResearchers: "Araştırmacı",
    statPubs: "Yayın",
    statCitations: "Atıf",
    statHindex: "h-endeksi",
    statCountries: "İş birliği ülkesi",
    statFaculties: "Fakülte",
    secCollab: "Uluslararası iş birlikleri",
    secCollabSub: "Akademi araştırmacılarının yayınlarında ortak yazar oldukları ülkeler (OpenAlex verilerine göre).",
    secRecent: "Son yayınlar",
    secAnnounce: "Duyurular",
    footerTag: "Açık altyapı: ORCID · OpenAlex · Crossref · Bakü 2026",
    loadingPubs: "Yayınlar yükleniyor...",
    announcements: [
      { tag: "Çağrı", title: "ORCID profilinizi güçlendirin", text: "Eserlerinizi ORCID'e ekleyin ve kurum olarak ADDA'yı belirtin — her doğru kayıt Akademinin uluslararası görünürlüğünü artırır.", date: "Devam ediyor" },
      { tag: "Yenilik", title: "Araştırmacı kataloğu açıldı", text: "Akademinin araştırma topluluğu artık herkese açık katalogda — alan, bölüm ve göstergelere göre arama yapılabilir.", date: "Yeni" },
      { tag: "Strateji", title: "Webometrics'e hazırlık", text: "Portal açık araştırma altyapısı (OpenAlex · ROR · ORCID) üzerine kurulmuştur — uluslararası sıralamaların yeni metodolojisiyle uyumludur.", date: "2026" },
    ],
  },
};

export function getLocale(): Locale {
  const c = cookies().get("locale")?.value as Locale | undefined;
  return c && (LOCALES as readonly string[]).includes(c) ? c : DEFAULT_LOCALE;
}

// Tədqiqatçının cari dilə uyğun adı. Dil üçün ad yoxdursa Azərbaycanca bazaya (full_name) keçir.
export function localizedName(
  r: { full_name: string; name_en?: string | null; name_ru?: string | null; name_tr?: string | null },
  locale: Locale
): string {
  const byLocale: Record<Locale, string | null | undefined> = {
    az: r.full_name,
    en: r.name_en,
    ru: r.name_ru,
    tr: r.name_tr,
  };
  const v = byLocale[locale];
  return v && v.trim() ? v.trim() : r.full_name;
}

export function getDict(locale: Locale): Dict {
  return DICT[locale] || DICT[DEFAULT_LOCALE];
}
