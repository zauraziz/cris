// ADDA Elm Portalı — email şablonları (Azərbaycanca, HTML).

const SITE = "https://cris.adda.edu.az";
const NAVY = "#0A2540";
const TEAL = "#0FA3B1";

function layout(title: string, intro: string, bodyHtml: string, ctaText?: string, ctaUrl?: string): string {
  const cta = ctaText && ctaUrl
    ? `<tr><td style="padding:8px 0 4px"><a href="${ctaUrl}" style="display:inline-block;background:${TEAL};color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:8px;font-size:15px">${ctaText}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="az"><body style="margin:0;background:#eef2f6;font-family:Segoe UI,Arial,sans-serif;color:${NAVY}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(6,26,46,.08)">
        <tr><td style="background:${NAVY};padding:20px 28px">
          <span style="color:#fff;font-size:18px;font-weight:700">ADDA Elm Portalı</span>
          <span style="color:#9fb4c7;font-size:12px;display:block;margin-top:2px">Cari Tədqiqat İnformasiya Sistemi (CRIS)</span>
        </td></tr>
        <tr><td style="padding:26px 28px 8px">
          <h1 style="margin:0 0 10px;font-size:20px;color:${NAVY}">${title}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33424f">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">${bodyHtml}${cta}</table>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid #eef0f3;margin-top:12px">
          <p style="margin:14px 0 0;font-size:12px;color:#8a97a4;line-height:1.6">
            Bu avtomatik bildiriş Azərbaycan Dövlət Dəniz Akademiyasının elm portalı tərəfindən göndərilib.
            Belə bildirişləri almaq istəmirsinizsə, portal idarəçiliyinə müraciət edin və ya
            <a href="${SITE}" style="color:${TEAL}">profilinizdə</a> tənzimləyin.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

const li = (s: string) => `<tr><td style="padding:3px 0;font-size:14px;color:#33424f">• ${s}</td></tr>`;

export function tplAccountStrengthen(name: string, profileUrl: string): { subject: string; html: string } {
  return {
    subject: "Elm portalında profilinizi gücləndirin — ADDA",
    html: layout(
      `Salam, ${name}`,
      "ADDA Elm Portalında profiliniz yaradılıb. Profilinizi tamamlamaq elmi görünürlüyünüzü və sitat alınma ehtimalını artırır:",
      li("ORCID identifikatorunuzu əlavə edin və təsdiqləyin") +
      li("Tədqiqat sahələrinizi seçin (OpenAlex taksonomiyası ilə uyğunlaşdırılır)") +
      li("Qısa bioqrafiya, foto və xarici profil linklərini (Scholar, ResearchGate) əlavə edin"),
      "Profilimə bax", profileUrl
    ),
  };
}

export function tplNewWorks(name: string, count: number, titles: string[], profileUrl: string): { subject: string; html: string } {
  const list = titles.slice(0, 5).map((t) => li(t)).join("");
  return {
    subject: `${count} yeni nəşr profilinizə əlavə olundu — ADDA`,
    html: layout(
      `Salam, ${name}`,
      `OpenAlex məlumatlarına əsasən profilinizə <b>${count}</b> yeni nəşr əlavə olundu:`,
      (list || li("Yeni işlər aşkarlandı.")),
      "Profilimdə bax", profileUrl
    ),
  };
}

export function tplOrcidNudge(name: string, profileUrl: string): { subject: string; html: string } {
  return {
    subject: "ORCID hesabınızı gücləndirin — ADDA Elm Portalı",
    html: layout(
      `Salam, ${name}`,
      "Profilinizdə ORCID identifikatoru qeyd olunmayıb. ORCID elmi işlərinizin sizə düzgün aid edilməsini təmin edir:",
      li("orcid.org ünvanında pulsuz hesab yaradın") +
      li("Nəşrlərinizi, mənsubiyyətinizi və təhsilinizi ORCID-ə əlavə edin") +
      li("ORCID-inizi portal profilinizə qeyd edin — göstəriciləriniz avtomatik yenilənəcək"),
      "Profilimə keç", profileUrl
    ),
  };
}

export function tplAreaSuggestion(name: string, original: string, suggested: string, field: string, profileUrl: string): { subject: string; html: string } {
  return {
    subject: "Tədqiqat sahəsi üzrə tövsiyə — ADDA Elm Portalı",
    html: layout(
      `Salam, ${name}`,
      `Profilinizdə əl ilə daxil etdiyiniz «<b>${original}</b>» tədqiqat sahəsi üçün standart bazalarda (OpenAlex) ən yaxın uyğun variant tapıldı:`,
      li(`Tövsiyə olunan sahə: <b>${suggested}</b>${field ? ` <span style="color:#8a97a4">(${field})</span>` : ""}`) +
      li("Standart sahə adı profilinizin axtarışlarda və qruplaşdırmada daha yaxşı görünməsini təmin edir."),
      "Profilimdə dəyiş", profileUrl
    ),
  };
}
