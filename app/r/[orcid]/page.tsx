import { getSql, ensureSchema } from "@/lib/db";
import type { Metadata } from "next";
import { fetchOpenAlexProfile, fetchOpenAlexWorks, type YearCount, type OaWork, type ResearchArea, type Affiliation } from "@/lib/openalex";
import { fetchOrcidWorks, type OrcidWork } from "@/lib/orcid";
import { getLocale, localizedName } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SITE = "https://cris.adda.edu.az";

type DbRow = {
  full_name: string;
  name_en: string | null;
  name_ru: string | null;
  name_tr: string | null;
  faculty: string;
  kafedra: string;
  position_title: string | null;
  orcid: string | null;
  openalex_id: string | null;
  scholar_id: string | null;
  researchgate: string | null;
  works_count: number;
  citations: number;
  h_index: number;
  i10_index: number;
  wos_works: number;
  wos_citations: number;
  wos_h_index: number;
  wos_checked_at: string | null;
  photo: string | null;
  bio: string | null;
  research_interests: string | null;
  linkedin: string | null;
  website: string | null;
};

async function getResearcher(orcid: string): Promise<DbRow | null> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT full_name, name_en, name_ru, name_tr, faculty, kafedra, position_title, orcid, openalex_id,
             scholar_id, researchgate, works_count, citations, h_index, i10_index,
             wos_works, wos_citations, wos_h_index, wos_checked_at,
             photo, bio, research_interests, linkedin, website
      FROM researchers WHERE orcid = ${orcid} LIMIT 1
    `) as DbRow[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { orcid: string } }): Promise<Metadata> {
  const orcid = decodeURIComponent(params.orcid).toUpperCase();
  const r = await getResearcher(orcid);
  if (!r) return { title: "Tədqiqatçı tapılmadı", robots: { index: false, follow: true } };
  const dn = localizedName(r, getLocale());
  const role = [r.position_title, r.kafedra].filter(Boolean).join(", ");
  const desc = `${dn}${role ? " — " + role : ""}, ${r.faculty}. ADDA Elm Portalı: ${r.works_count} nəşr, ${r.citations} istinad, h-indeks ${r.h_index}.`;
  return {
    title: dn,
    description: desc,
    alternates: { canonical: `/r/${orcid}` },
    openGraph: {
      title: `${dn} — ADDA Elm Portalı`,
      description: desc,
      type: "profile",
      url: `${SITE}/r/${orcid}`,
      images: [{ url: "/adda-logo.png" }],
    },
  };
}

export default async function ResearcherPage({ params }: { params: { orcid: string } }) {
  const orcid = decodeURIComponent(params.orcid).toUpperCase();
  const r = await getResearcher(orcid);

  // Bazada yoxdursa
  if (!r) {
    return (
      <>
        <DetailTopbar />
        <div className="shell">
          <div className="page" style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 26, marginBottom: 10 }}>Tədqiqatçı tapılmadı</h1>
            <p style={{ color: "var(--muted)" }}>Bu ORCID ilə qeydiyyatlı tədqiqatçı yoxdur.</p>
            <a href="/admin" className="btn-ghost" style={{ marginTop: 18, display: "inline-flex" }}>← İdarəetmə panelinə</a>
          </div>
        </div>
      </>
    );
  }

  const [stats, works] = await Promise.all([
    fetchOpenAlexProfile(orcid),
    fetchOpenAlexWorks(orcid, 50),
  ]);

  // OpenAlex bu ORCID üçün publikasiya qaytarmadıqda — siyahını ORCID-dən gətir
  const orcidWorks: OrcidWork[] =
    works.length === 0 && r.orcid ? await fetchOrcidWorks(r.orcid) : [];

  // Vahid publikasiya siyahısı: OpenAlex varsa ondan, yoxsa ORCID-dən
  type PubItem = { key: string; title: string; url: string | null; year: number | null; venue: string | null; type: string | null; citations: number | null; isOA: boolean };
  const fromOa: PubItem[] = works.map((w) => ({ key: w.id, title: w.title, url: w.doi || w.id, year: w.year, venue: w.venue, type: workType(w.type), citations: w.citations, isOA: w.isOA }));
  const fromOrcid: PubItem[] = orcidWorks.map((w, i) => ({ key: (w.doi || w.title) + i, title: w.title, url: w.url, year: w.year, venue: w.journal, type: orcidType(w.type), citations: null, isOA: false }));
  const pubList: PubItem[] = fromOa.length ? fromOa : fromOrcid;
  const pubSource = fromOa.length ? "OpenAlex" : "ORCID";
  // Yekun publikasiya sayı: OpenAlex tapıbsa onun sayı, yoxsa ORCID-dən gələn / bazadakı say
  const oaFound = stats.found && fromOa.length > 0;

  // Canlı OpenAlex məlumatı, yoxdursa bazadakı dəyər
  const pub = stats.found ? stats.worksCount : (orcidWorks.length || r.works_count);
  const cit = stats.found ? stats.citations : r.citations;
  const h = stats.found ? stats.hIndex : r.h_index;
  const i10 = stats.found ? stats.i10Index : r.i10_index;
  const years = stats.countsByYear.filter((y) => y.year >= new Date().getFullYear() - 11);

  // Karyera xülasəsi (mövcud məlumatdan)
  const peak = years.reduce<YearCount | null>((m, y) => (!m || y.works > m.works ? y : m), null);
  const avgCit = pub > 0 ? Math.round(cit / pub) : 0;
  const activeYears = years.filter((y) => y.works > 0).length;
  const topField = stats.topics[0]?.name || "—";

  const dn = localizedName(r, getLocale());
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: dn,
    ...(r.position_title ? { jobTitle: r.position_title } : {}),
    affiliation: { "@type": "CollegeOrUniversity", name: "Azərbaycan Dövlət Dəniz Akademiyası", sameAs: "https://ror.org/01znwv148" },
    ...(r.orcid ? { identifier: `https://orcid.org/${r.orcid}` } : {}),
    url: `${SITE}/r/${orcid}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      <DetailTopbar />
      <div className="shell">
        <div className="page">
          <a href="/admin" className="back-link">← İdarəetmə panelinə</a>

          {/* Header */}
          <div className="rd-header">
            <div className="rd-avatar">
              {r.photo ? <img src={r.photo} alt={dn} className="rd-photo" /> : initials(dn)}
            </div>
            <div className="rd-headinfo">
              <h1>{dn}</h1>
              <div className="rd-sub">{[r.position_title, r.kafedra, r.faculty].filter(Boolean).join(" · ")}</div>
              <div className="rd-links">
                {r.orcid && <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noreferrer" className="rd-link orcid"><b>ORCID</b> {r.orcid}</a>}
                {r.scholar_id && <a href={`https://scholar.google.com/citations?user=${r.scholar_id}`} target="_blank" rel="noreferrer" className="rd-link">Google Scholar</a>}
                {r.researchgate && <a href={`https://www.researchgate.net/profile/${r.researchgate}`} target="_blank" rel="noreferrer" className="rd-link">ResearchGate</a>}
                {r.linkedin && <a href={normalizeUrl(r.linkedin)} target="_blank" rel="noreferrer" className="rd-link">LinkedIn</a>}
                {r.website && <a href={normalizeUrl(r.website)} target="_blank" rel="noreferrer" className="rd-link">Veb sayt</a>}
              </div>
            </div>
          </div>

          {r.bio && <div className="rd-bio">{r.bio}</div>}

          {r.research_interests && (
            <div className="rd-interests">
              {areaNames(r.research_interests).map((t, i) => (
                <span className="interest-chip" key={i}>{t}</span>
              ))}
            </div>
          )}

          {/* Metrics — OpenAlex (tapılıbsa) və ya ORCID (mənbə kimi) */}
          {oaFound ? (
            <div className="src-tag"><span className="src-dot oa" /> OpenAlex · açıq baza</div>
          ) : (
            <div className="src-tag"><span className="src-dot" style={{ background: "#16a34a" }} /> ORCID · özü-bəyan edilmiş profil</div>
          )}
          <div className="kpi-row" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 6 }}>
            <Kpi n={pub} l="Publikasiya" path={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />
            <Kpi n={cit} l="Sitat" gold path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
            <Kpi n={h} l="h-indeks" gold path={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>} />
            <Kpi n={i10} l="i10-indeks" path={<><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></>} />
          </div>

          {/* Metrics — Web of Science (yoxlanılıbsa) */}
          {r.wos_checked_at && (
            <>
              <div className="src-tag" style={{ marginTop: 18 }}>
                <span className="src-dot wos" /> Web of Science · rəsmi indeks
                <span className="src-date">yoxlanıldı: {new Date(r.wos_checked_at).toLocaleDateString("az-AZ")}</span>
              </div>
              {r.wos_works > 0 ? (
                <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 6 }}>
                  <Kpi n={r.wos_works} l="WoS publikasiya" path={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />
                  <Kpi n={r.wos_citations} l="WoS sitat" gold path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
                  <Kpi n={r.wos_h_index} l="WoS h-indeks" gold path={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>} />
                </div>
              ) : (
                <div className="note-strip" style={{ marginTop: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <span>ORCID-dəki DOI-lər Web of Science indeksində tapılmadı. WoS əhatəsi üçün DOI-li, beynəlxalq nəşrlər lazımdır.</span>
                </div>
              )}
            </>
          )}

          {!oaFound && (
            <div className="note-strip" style={{ marginTop: 22 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>OpenAlex bu ORCID-i hələ tanımır. Publikasiya siyahısı və sayı ORCID-dən alınıb; sitat və h-indeks OpenAlex bu profili indeksləşdirdikdən sonra avtomatik görünəcək.</span>
            </div>
          )}

          {/* Yearly trends */}
          {years.length > 0 && (
            <div className="rd-charts">
              <div className="card"><div className="card-pad">
                <div className="rd-chart-title">Publikasiya — il üzrə</div>
                <YearBars items={years} valueKey="works" color="linear-gradient(180deg,var(--teal),var(--teal-dk))" />
              </div></div>
              <div className="card"><div className="card-pad">
                <div className="rd-chart-title">Sitat — il üzrə</div>
                <YearBars items={years} valueKey="citations" color="linear-gradient(180deg,var(--gold),var(--gold-dk))" />
              </div></div>
            </div>
          )}

          {/* ===== Akademik karyera xəritəsi ===== */}
          {stats.found && (
            <>
              <div className="dash-toolbar" style={{ marginTop: 34 }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, color: "var(--navy)", fontWeight: 600 }}>Akademik karyera xəritəsi</div>
                <div className="legend"><span style={{ color: "var(--faint)" }}>Mənbə: OpenAlex</span></div>
              </div>

              {/* Karyera xülasəsi */}
              <div className="cstat-row">
                <div className="cstat"><div className="cstat-l">Əsas tədqiqat sahəsi</div><div className="cstat-v" style={{ fontSize: 15 }}>{topField}</div></div>
                <div className="cstat"><div className="cstat-l">Ən məhsuldar il</div><div className="cstat-v">{peak ? `${peak.year}` : "—"}{peak ? <span className="cstat-x"> · {peak.works} nəşr</span> : null}</div></div>
                <div className="cstat"><div className="cstat-l">Orta sitat / əsər</div><div className="cstat-v">{avgCit}</div></div>
                <div className="cstat"><div className="cstat-l">Nəşrli illər (dövr ərzində)</div><div className="cstat-v">{activeYears}</div></div>
              </div>

              {/* Karyera qövsü (məcmu) */}
              {years.length >= 2 && (
                <div className="card" style={{ marginTop: 18 }}><div className="card-pad">
                  <div className="rd-chart-title">Karyera qövsü — məcmu publikasiya</div>
                  <CareerArc items={years} />
                  <div className="arc-cap">
                    <span>{years[0].year}</span>
                    <span>Məcmu: <b>{years.reduce((s, y) => s + y.works, 0)}</b> publikasiya (dövr ərzində)</span>
                    <span>{years[years.length - 1].year}</span>
                  </div>
                </div></div>
              )}

              <div className="rd-charts" style={{ marginTop: 18 }}>
                {/* Tədqiqat sahələri */}
                <div className="card"><div className="card-pad">
                  <div className="rd-chart-title">Tədqiqat sahələri</div>
                  {stats.topics.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--faint)" }}>Sahə məlumatı yoxdur.</div>
                  ) : (
                    <div className="area-list">
                      {stats.topics.map((t, idx) => {
                        const max = Math.max(1, ...stats.topics.map((x) => x.value));
                        const w = Math.max(6, Math.round((t.value / max) * 100));
                        return (
                          <div className="area-row" key={idx}>
                            <div className="area-name" title={t.name}>{t.name}</div>
                            <div className="area-bar"><div className="area-fill" style={{ width: w + "%" }} /></div>
                            <div className="area-val">{t.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div></div>

                {/* Mənsubiyyət tarixçəsi */}
                <div className="card"><div className="card-pad">
                  <div className="rd-chart-title">Mənsubiyyət tarixçəsi</div>
                  {stats.affiliations.length === 0 ? (
                    <div style={{ fontSize: 13, color: "var(--faint)" }}>Mənsubiyyət məlumatı yoxdur.</div>
                  ) : (
                    <div className="aff-list">
                      {stats.affiliations.map((af, idx) => (
                        <div className="aff-row" key={idx}>
                          <div className="aff-dot" />
                          <div className="aff-info">
                            <div className="aff-name">{af.name}</div>
                            <div className="aff-years">
                              {af.startYear && af.endYear ? (af.startYear === af.endYear ? af.startYear : `${af.startYear}–${af.endYear}`) : "—"}
                              {af.country ? ` · ${af.country}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div></div>
              </div>
            </>
          )}

          {/* Publications */}
          <div className="dash-toolbar" style={{ marginTop: 30 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>
              Publikasiyalar {pubList.length > 0 && <span style={{ color: "var(--faint)", fontWeight: 400 }}>({pubList.length}{pub > pubList.length ? `, ən son ${pubList.length}` : ""})</span>}
            </div>
            <div className="legend"><span style={{ color: "var(--faint)" }}>Mənbə: {pubSource}</span></div>
          </div>

          {pubList.length === 0 ? (
            <div className="card"><div className="card-pad" style={{ textAlign: "center", color: "var(--faint)" }}>
              Hələlik publikasiya tapılmadı. OpenAlex və ya ORCID-də DOI-li nəşrlər göründükdə avtomatik əlavə olunacaq.
            </div></div>
          ) : (
            <div className="card"><div className="pub-list">
              {pubList.map((w) => (
                <div className="pub-item" key={w.key}>
                  <div className="pub-main">
                    {w.url ? (
                      <a href={w.url} target="_blank" rel="noreferrer" className="pub-title">{w.title}</a>
                    ) : (
                      <span className="pub-title" style={{ cursor: "default" }}>{w.title}</span>
                    )}
                    <div className="pub-meta">
                      {[w.year, w.venue, w.type].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="pub-side">
                    {w.isOA && <span className="pub-oa">Açıq giriş</span>}
                    {w.citations !== null && <span className="pub-cit">{w.citations} sitat</span>}
                  </div>
                </div>
              ))}
            </div></div>
          )}
        </div>

        <div className="foot">
          <b>ADDA Elm Portalı</b> — Current Research Information System · Cari Tədqiqat İnformasiya Sistemi (CRIS)<br/>
          Tədqiqatçı profili · Elmmetrik mənbə: OpenAlex · ORCID · Bakı 2026
        </div>
      </div>
    </>
  );
}

// ===== helpers / small components =====
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function normalizeUrl(u: string): string {
  const s = u.trim();
  return /^https?:\/\//i.test(s) ? s : "https://" + s;
}
// research_interests: JSON massiv [{id,name}] və ya köhnə vergüllü mətn
function areaNames(raw: string): string[] {
  const s = (raw || "").trim();
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((x: any) => (x && x.name ? String(x.name) : "")).filter(Boolean);
    } catch {}
  }
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}
function workType(t: string | null): string | null {
  if (!t) return null;
  const map: Record<string, string> = {
    article: "Məqalə", "book-chapter": "Kitab fəsli", book: "Kitab",
    proceedings: "Konfrans", "proceedings-article": "Konfrans məqaləsi",
    dissertation: "Dissertasiya", report: "Hesabat", preprint: "Preprint",
    dataset: "Dataset", review: "İcmal",
  };
  return map[t] || t;
}

// ORCID əsər tipləri (məs. JOURNAL_ARTICLE) → Azərbaycanca
function orcidType(t: string | null): string | null {
  if (!t) return null;
  const map: Record<string, string> = {
    JOURNAL_ARTICLE: "Məqalə", CONFERENCE_PAPER: "Konfrans məqaləsi",
    CONFERENCE_ABSTRACT: "Konfrans tezisi", CONFERENCE_POSTER: "Poster",
    BOOK: "Kitab", BOOK_CHAPTER: "Kitab fəsli", BOOK_REVIEW: "Kitab icmalı",
    DISSERTATION_THESIS: "Dissertasiya", REPORT: "Hesabat", PREPRINT: "Preprint",
    DATA_SET: "Dataset", PATENT: "Patent", WORKING_PAPER: "İşçi sənəd",
    MAGAZINE_ARTICLE: "Jurnal yazısı", NEWSLETTER_ARTICLE: "Bülleten", OTHER: "Digər",
  };
  return map[t] || t.toLowerCase().replace(/_/g, " ");
}

function DetailTopbar() {
  return (
    <div className="topbar">
      <div className="topbar-in">
        <a className="brand" href="/" style={{ textDecoration: "none" }}>
          <div className="brand-mark">
            <img src="/adda-logo.png" alt="ADDA" />
          </div>
          <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Cari Tədqiqat İnformasiya Sistemi (CRIS)</span></div>
        </a>
      </div>
    </div>
  );
}

function Kpi({ n, l, path, gold }: { n: number | string; l: string; path: React.ReactNode; gold?: boolean }) {
  return (
    <div className={"kpi" + (gold ? " gold" : "")}>
      <div className="ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{path}</svg></div>
      <div className="kn">{n}</div>
      <div className="kl">{l}</div>
    </div>
  );
}

function CareerArc({ items }: { items: YearCount[] }) {
  if (items.length < 2) return null;
  let cum = 0;
  const pts = items.map((it) => { cum += it.works; return { year: it.year, cum }; });
  const W = 660, H = 150, padL = 6, padR = 6, padT = 14, padB = 10;
  const maxCum = Math.max(1, pts[pts.length - 1].cum);
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxCum) * (H - padT - padB);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="arc-svg" role="img" aria-label="Məcmu publikasiya qrafiki">
      <defs>
        <linearGradient id="arcg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(15,163,177,.30)" />
          <stop offset="100%" stopColor="rgba(15,163,177,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#arcg)" />
      <path d={line} fill="none" stroke="#0a7f8a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.cum)} r="3" fill="#fff" stroke="#0a7f8a" strokeWidth="1.8" />
      ))}
    </svg>
  );
}

function YearBars({ items, valueKey, color }: { items: YearCount[]; valueKey: "works" | "citations"; color: string }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey]));
  return (
    <div className="ybars">
      {items.map((it) => {
        const v = it[valueKey];
        const hpct = Math.max(2, Math.round((v / max) * 100));
        return (
          <div className="ybar-col" key={it.year} title={`${it.year}: ${v}`}>
            <div className="ybar-val">{v}</div>
            <div className="ybar-track"><div className="ybar-fill" style={{ height: hpct + "%", background: color }} /></div>
            <div className="ybar-year">'{String(it.year).slice(2)}</div>
          </div>
        );
      })}
    </div>
  );
}
