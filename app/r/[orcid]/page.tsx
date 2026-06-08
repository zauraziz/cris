import { getSql, ensureSchema } from "@/lib/db";
import { fetchOpenAlexProfile, fetchOpenAlexWorks, type YearCount, type OaWork, type ResearchArea, type Affiliation } from "@/lib/openalex";

export const dynamic = "force-dynamic";

type DbRow = {
  full_name: string;
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
};

async function getResearcher(orcid: string): Promise<DbRow | null> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT full_name, faculty, kafedra, position_title, orcid, openalex_id,
             scholar_id, researchgate, works_count, citations, h_index, i10_index,
             wos_works, wos_citations, wos_h_index, wos_checked_at
      FROM researchers WHERE orcid = ${orcid} LIMIT 1
    `) as DbRow[];
    return rows[0] || null;
  } catch {
    return null;
  }
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

  // Canlı OpenAlex məlumatı, yoxdursa bazadakı dəyər
  const pub = stats.found ? stats.worksCount : r.works_count;
  const cit = stats.found ? stats.citations : r.citations;
  const h = stats.found ? stats.hIndex : r.h_index;
  const i10 = stats.found ? stats.i10Index : r.i10_index;
  const years = stats.countsByYear.filter((y) => y.year >= new Date().getFullYear() - 11);

  // Karyera xülasəsi (mövcud məlumatdan)
  const peak = years.reduce<YearCount | null>((m, y) => (!m || y.works > m.works ? y : m), null);
  const avgCit = pub > 0 ? Math.round(cit / pub) : 0;
  const activeYears = years.filter((y) => y.works > 0).length;
  const topField = stats.topics[0]?.name || "—";

  return (
    <>
      <DetailTopbar />
      <div className="shell">
        <div className="page">
          <a href="/admin" className="back-link">← İdarəetmə panelinə</a>

          {/* Header */}
          <div className="rd-header">
            <div className="rd-avatar">{initials(r.full_name)}</div>
            <div className="rd-headinfo">
              <h1>{r.full_name}</h1>
              <div className="rd-sub">{[r.position_title, r.kafedra, r.faculty].filter(Boolean).join(" · ")}</div>
              <div className="rd-links">
                {r.orcid && <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noreferrer" className="rd-link orcid"><b>ORCID</b> {r.orcid}</a>}
                {r.scholar_id && <a href={`https://scholar.google.com/citations?user=${r.scholar_id}`} target="_blank" rel="noreferrer" className="rd-link">Google Scholar</a>}
                {r.researchgate && <a href={`https://www.researchgate.net/profile/${r.researchgate}`} target="_blank" rel="noreferrer" className="rd-link">ResearchGate</a>}
              </div>
            </div>
          </div>

          {/* Metrics — OpenAlex */}
          <div className="src-tag"><span className="src-dot oa" /> OpenAlex · açıq baza</div>
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

          {!stats.found && (
            <div className="note-strip" style={{ marginTop: 22 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>Bu ORCID OpenAlex-də tapılmadı (yeni profil ola bilər). Göstəricilər bazadakı son dəyərlərdir.</span>
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
              Publikasiyalar {works.length > 0 && <span style={{ color: "var(--faint)", fontWeight: 400 }}>({works.length}{pub > works.length ? `, ən son ${works.length}` : ""})</span>}
            </div>
            <div className="legend"><span style={{ color: "var(--faint)" }}>Mənbə: OpenAlex</span></div>
          </div>

          {works.length === 0 ? (
            <div className="card"><div className="card-pad" style={{ textAlign: "center", color: "var(--faint)" }}>
              OpenAlex-də publikasiya tapılmadı.
            </div></div>
          ) : (
            <div className="card"><div className="pub-list">
              {works.map((w) => (
                <div className="pub-item" key={w.id}>
                  <div className="pub-main">
                    <a href={w.doi || w.id} target="_blank" rel="noreferrer" className="pub-title">{w.title}</a>
                    <div className="pub-meta">
                      {[w.year, w.venue, workType(w.type)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="pub-side">
                    {w.isOA && <span className="pub-oa">Açıq giriş</span>}
                    <span className="pub-cit">{w.citations} sitat</span>
                  </div>
                </div>
              ))}
            </div></div>
          )}
        </div>

        <div className="foot">
          <b>ADDA Elm Portalı</b> · Tədqiqatçı profili · Bakı 2026<br/>
          Elmmetrik mənbə: OpenAlex · ORCID
        </div>
      </div>
    </>
  );
}

// ===== helpers / small components =====
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
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

function DetailTopbar() {
  return (
    <div className="topbar">
      <div className="topbar-in">
        <a className="brand" href="/" style={{ textDecoration: "none" }}>
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>
          </div>
          <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Tədqiqatçı profili</span></div>
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
