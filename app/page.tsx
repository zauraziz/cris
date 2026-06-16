import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE, ADDA_ROR, ADDA_ROR_URL } from "@/lib/adda";
import { fetchInstitutionByRor, fetchInstitutionCoauthorCountries, fetchInstitutionRecentWorks } from "@/lib/openalex";
import WorldMap from "@/components/WorldMap";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLocale, getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SITE = "https://cris.adda.edu.az";

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

export default async function Home() {
  const locale = getLocale();
  const t = getDict(locale);
  const inst = await fetchInstitutionByRor(ADDA_ROR);
  const [countries, recent, researchers] = await Promise.all([
    inst.found && inst.openalexId ? fetchInstitutionCoauthorCountries(inst.openalexId) : Promise.resolve([]),
    inst.found && inst.openalexId ? fetchInstitutionRecentWorks(inst.openalexId, 6) : Promise.resolve([]),
    getResearcherCount(),
  ]);
  const facultyCount = Object.keys(ADDA_STRUCTURE).length;
  const countryCount = countries.length;
  const nf = (n: number) => n.toLocaleString(locale);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: "Azərbaycan Dövlət Dəniz Akademiyası",
    alternateName: "Azerbaijan State Marine Academy",
    url: SITE,
    logo: `${SITE}/adda-logo.png`,
    sameAs: [ADDA_ROR_URL, "https://www.adda.edu.az"],
  };

  return (
    <div className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-in">
          <a className="brand" href="/" style={{ textDecoration: "none" }}>
            <div className="brand-mark"><img src="/adda-logo.png" alt="ADDA" /></div>
            <div className="brand-txt"><b>ADDA Elm Portalı</b><span>{t.brandSub}</span></div>
          </a>
          <div className="topbar-spacer" />
          <LanguageSwitcher current={locale} />
        </div>
      </div>

      <div className="page" style={{ paddingTop: 30 }}>
        {/* Hero */}
        <div className="lp-hero">
          <div className="eyebrow">{t.heroEyebrow}</div>
          <h1 className="lp-title">{t.heroTitle}</h1>
          <p className="lp-sub">{t.heroSub}</p>
          <div className="lp-cta">
            <a className="btn-teal-sm" href="/researchers">{t.ctaCatalog}</a>
            <a className="btn-ghost-sm" href="/login">{t.ctaLogin}</a>
          </div>
        </div>

        {/* Statistika */}
        <div className="lp-section-head">{t.secStats}</div>
        <div className="lp-stats">
          <Stat n={researchers} l={t.statResearchers} icon="users" />
          <Stat n={inst.found ? nf(inst.worksCount) : "—"} l={t.statPubs} icon="doc" />
          <Stat n={inst.found ? nf(inst.citations) : "—"} l={t.statCitations} icon="quote" gold />
          <Stat n={inst.found ? inst.hIndex : "—"} l={t.statHindex} icon="chart" gold />
          <Stat n={countryCount || "—"} l={t.statCountries} icon="globe" />
          <Stat n={facultyCount} l={t.statFaculties} icon="building" />
        </div>

        {/* Beynəlxalq əməkdaşlıq xəritəsi */}
        {inst.found && (
          <>
            <div className="lp-section-head">{t.secCollab}</div>
            <p className="lp-section-sub">{t.secCollabSub}</p>
            <div className="card"><div style={{ padding: 18 }}>
              <WorldMap countries={countries} />
            </div></div>
          </>
        )}

        {/* Son nəşrlər + Elanlar */}
        <div className="lp-twocol">
          <div>
            <div className="lp-section-head">{t.secRecent}</div>
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
              <div className="card"><div className="card-pad" style={{ color: "var(--faint)", textAlign: "center" }}>{t.loadingPubs}</div></div>
            )}
          </div>

          <div>
            <div className="lp-section-head">{t.secAnnounce}</div>
            <div className="ann-list">
              {t.announcements.map((a, i) => (
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
          <b>ADDA Elm Portalı</b> — Current Research Information System · {t.brandSub}<br/>
          ROR: <a href={ADDA_ROR_URL} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{ADDA_ROR}</a> · {t.footerTag}
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
