import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE, ADDA_ROR, ADDA_ROR_URL } from "@/lib/adda";
import { fetchInstitutionByRor, fetchInstitutionCoauthorCountries, fetchInstitutionRecentWorks } from "@/lib/openalex";
import WorldMap from "@/components/WorldMap";

export const dynamic = "force-dynamic";

async function getResearcherCount(): Promise<number> {
  try {
    await ensureSchema();
    const sql = getSql();
    const r = (await sql`SELECT COUNT(*)::int AS n FROM researchers WHERE status = 'approved' OR status IS NULL`) as { n: number }[];
    return r[0]?.n || 0;
  } catch {
    return 0;
  }
}

function workType(t: string | null): string {
  const m: Record<string, string> = { article: "Məqalə", "book-chapter": "Kitab fəsli", book: "Kitab", "proceedings-article": "Konfrans məqaləsi", preprint: "Preprint", dataset: "Dataset", review: "İcmal", report: "Hesabat" };
  return t ? (m[t] || t) : "";
}

// Layihə ideyasına uyğun elanlar (rəqəmsal elmi nüfuz / açıq elm)
const ANNOUNCEMENTS = [
  { tag: "Çağırış", title: "ORCID profilinizi gücləndirin", text: "Əsərlərinizi ORCID-ə əlavə edin və mənsubiyyət olaraq ADDA-nı göstərin — hər düzgün qeyd Akademiyanın beynəlxalq görünürlüyünü artırır.", date: "Davam edir" },
  { tag: "Yenilik", title: "Tədqiqatçı kataloqu açıldı", text: "Akademiyanın elmi icması artıq ictimai kataloqda — sahə, kafedra və göstəricilər üzrə axtarış mümkündür.", date: "Yeni" },
  { tag: "Strategiya", title: "Webometrics-ə hazırlıq", text: "Portal açıq elmi infrastruktur (OpenAlex · ROR · ORCID) üzərində qurulub — bu, beynəlxalq reytinqin yeni metodologiyası ilə uyğundur.", date: "2026" },
];

export default async function Home() {
  const inst = await fetchInstitutionByRor(ADDA_ROR);
  const [countries, recent, researchers] = await Promise.all([
    inst.found && inst.openalexId ? fetchInstitutionCoauthorCountries(inst.openalexId) : Promise.resolve([]),
    inst.found && inst.openalexId ? fetchInstitutionRecentWorks(inst.openalexId, 6) : Promise.resolve([]),
    getResearcherCount(),
  ]);
  const facultyCount = Object.keys(ADDA_STRUCTURE).length;
  const countryCount = countries.length;

  return (
    <div className="shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-in">
          <a className="brand" href="/" style={{ textDecoration: "none" }}>
            <div className="brand-mark"><img src="/adda-logo.png" alt="ADDA" /></div>
            <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Cari Tədqiqat İnformasiya Sistemi (CRIS)</span></div>
          </a>
          <div className="topbar-spacer" />
          <a className="nav-link" href="/researchers">Tədqiqatçılar</a>
          <a className="nav-btn" href="/login">Tədqiqatçı girişi</a>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 30 }}>
        {/* Hero */}
        <div className="lp-hero">
          <div className="eyebrow">Azərbaycan Dövlət Dəniz Akademiyası</div>
          <h1 className="lp-title">Akademiyanın elmi nüfuzu — bir platformada</h1>
          <p className="lp-sub">Tədqiqatçı profilləri, beynəlxalq göstəricilər və açıq elmi məlumat — Current Research Information System.</p>
          <div className="lp-cta">
            <a className="btn-teal-sm" href="/researchers">Tədqiqatçı kataloquna bax</a>
            <a className="btn-ghost-sm" href="/login">Sistemə daxil ol</a>
          </div>
        </div>

        {/* Statistika */}
        <div className="lp-section-head">Hesabatlar və statistika</div>
        <div className="lp-stats">
          <Stat n={researchers} l="Tədqiqatçı" icon="users" />
          <Stat n={inst.found ? inst.worksCount.toLocaleString("az-AZ") : "—"} l="Nəşr" icon="doc" />
          <Stat n={inst.found ? inst.citations.toLocaleString("az-AZ") : "—"} l="İstinad (sitat)" icon="quote" gold />
          <Stat n={inst.found ? inst.hIndex : "—"} l="h-indeks" icon="chart" gold />
          <Stat n={countryCount || "—"} l="Əməkdaşlıq ölkəsi" icon="globe" />
          <Stat n={facultyCount} l="Fakültə" icon="building" />
        </div>

        {/* Beynəlxalq əməkdaşlıq xəritəsi */}
        {countries.length > 0 && (
          <>
            <div className="lp-section-head">Beynəlxalq əməkdaşlıqlar</div>
            <p className="lp-section-sub">Akademiya tədqiqatçılarının nəşrlərində həmmüəllif olduqları ölkələr (OpenAlex məlumatları əsasında).</p>
            <div className="card"><div style={{ padding: 18 }}>
              <WorldMap countries={countries} />
            </div></div>
          </>
        )}

        {/* Son nəşrlər + Elanlar */}
        <div className="lp-twocol">
          <div>
            <div className="lp-section-head">Son nəşrlər</div>
            {recent.length > 0 ? (
              <div className="card"><div className="pub-list">
                {recent.map((w, i) => (
                  <div className="pub-item" key={i}>
                    <div className="pub-main">
                      {w.doi ? <a href={w.doi} target="_blank" rel="noreferrer" className="pub-title">{w.title}</a> : <span className="pub-title">{w.title}</span>}
                      <div className="pub-meta">{[w.authors, w.year, w.venue, workType(w.type)].filter(Boolean).join(" · ")}</div>
                    </div>
                  </div>
                ))}
              </div></div>
            ) : (
              <div className="card"><div className="card-pad" style={{ color: "var(--faint)", textAlign: "center" }}>Nəşrlər yüklənir...</div></div>
            )}
          </div>

          <div>
            <div className="lp-section-head">Elanlar</div>
            <div className="ann-list">
              {ANNOUNCEMENTS.map((a, i) => (
                <div className="ann-item" key={i}>
                  <div className="ann-top"><span className="ann-tag">{a.tag}</span><span className="ann-date">{a.date}</span></div>
                  <div className="ann-title">{a.title}</div>
                  <div className="ann-text">{a.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="foot">
          <b>ADDA Elm Portalı</b> — Current Research Information System · Cari Tədqiqat İnformasiya Sistemi (CRIS)<br/>
          ROR: <a href={ADDA_ROR_URL} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{ADDA_ROR}</a> · Açıq mənbə infrastrukturu: ORCID · OpenAlex · Crossref · Bakı 2026
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, icon, gold }: { n: any; l: string; icon: string; gold?: boolean }) {
  const paths: Record<string, React.ReactNode> = {
    users: <><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0112 0v1M17 11a4 4 0 000-8M22 21v-1a6 6 0 00-4-5.6"/></>,
    doc: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
    quote: <><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20a15 15 0 010-20"/></>,
    building: <><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></>,
  };
  return (
    <div className="lp-stat">
      <div className={"lp-stat-ic" + (gold ? " gold" : "")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
      </div>
      <div className="lp-stat-n">{n}</div>
      <div className="lp-stat-l">{l}</div>
    </div>
  );
}
