import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE } from "@/lib/adda";
import FacultyAccordion, { FacultyStat } from "@/components/FacultyAccordion";

export const dynamic = "force-dynamic";

type Row = { faculty: string; kafedra: string; works_count: number; citations: number; h_index: number; orcid: string | null };

async function getRows(): Promise<{ rows: Row[]; dbError: boolean }> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT faculty, kafedra, works_count, citations, h_index, orcid FROM researchers
    `) as Row[];
    return { rows, dbError: false };
  } catch (err) {
    console.error("[/dashboard] oxuma xətası:", err);
    return { rows: [], dbError: true };
  }
}

export default async function DashboardPage() {
  const { rows, dbError } = await getRows();

  const totalResearchers = rows.length;
  const totalWorks = rows.reduce((s, r) => s + (r.works_count || 0), 0);
  const totalCitations = rows.reduce((s, r) => s + (r.citations || 0), 0);
  const maxHIndex = rows.reduce((m, r) => Math.max(m, r.h_index || 0), 0);

  const faculties: FacultyStat[] = Object.entries(ADDA_STRUCTURE).map(([fac, kafedras]) => {
    const facRows = rows.filter((r) => r.faculty === fac);
    return {
      name: fac,
      count: facRows.length,
      works: facRows.reduce((s, r) => s + (r.works_count || 0), 0),
      citations: facRows.reduce((s, r) => s + (r.citations || 0), 0),
      kafedras: kafedras.map((k) => {
        const kr = facRows.filter((r) => r.kafedra === k);
        return {
          name: k,
          count: kr.length,
          works: kr.reduce((s, r) => s + (r.works_count || 0), 0),
          citations: kr.reduce((s, r) => s + (r.citations || 0), 0),
        };
      }),
    };
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <a className="brand" href="/" style={{ textDecoration: "none" }}>
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>
            </div>
            <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Elmmetrik Profil Sistemi</span></div>
          </a>
          <div className="topbar-spacer" />
          <a className="btn-ghost" href="/">← Profil daxiletmə</a>
        </div>
      </div>

      <div className="shell">
        <div className="page">
          <div className="page-head">
            <div className="eyebrow">İnstitusional analitika</div>
            <h1>ADDA elmmetrik mənzərəsi</h1>
            <p>Fakültə və kafedralar üzrə qeydiyyatdan keçmiş tədqiqatçılar və onların publikasiya göstəriciləri. Məlumatlar real vaxtda yenilənir.</p>
          </div>

          {dbError && (
            <div className="note-strip" style={{ background: "#fdeeed", borderColor: "#f5c6c4", borderLeftColor: "#d9534f", color: "#a23b38" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.5 0z"/></svg>
              <span><b>Verilənlər bazasına bağlantı yoxdur.</b> DATABASE_URL mühit dəyişənini təyin edin və <code>npm run db:init</code> əmrini işlədin (və ya Neon panelində db/schema.sql faylını icra edin).</span>
            </div>
          )}

          <div className="note-strip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.5 0z"/></svg>
            <span><b>Pilot mərhələ.</b> Publikasiya, sitat və h-indeks göstəriciləri <b>OpenAlex açıq bazasından</b> avtomatik alınır. Fakültə/kafedra strukturu nümunədir — real ADDA strukturu ilə əvəz olunmalıdır (lib/adda.ts).</span>
          </div>

          <div className="kpi-row">
            <Kpi n={totalResearchers} l="Qeydiyyatlı tədqiqatçı" path={<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>} />
            <Kpi n={totalWorks} l="Toplam publikasiya" path={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />
            <Kpi n={totalCitations} l="Toplam sitat" gold path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
            <Kpi n={maxHIndex} l="Ən yüksək h-indeks" gold path={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>} />
          </div>

          <div className="dash-toolbar">
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>Fakültələr üzrə bölgü</div>
            <div className="legend"><span><i style={{ background: "var(--teal)" }} />Publikasiya həcmi (kafedra üzrə)</span><span style={{ color: "var(--faint)" }}>Mənbə: OpenAlex</span></div>
          </div>

          <FacultyAccordion faculties={faculties} />

          {totalResearchers === 0 && !dbError && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--faint)", fontSize: 14 }}>
              Hələ heç bir tədqiqatçı qeydiyyatdan keçməyib. <a href="/" style={{ color: "var(--teal-dk)", fontWeight: 600 }}>İlk profili əlavə edin →</a>
            </div>
          )}
        </div>

        <div className="foot">
          <b>ADDA Elm Portalı</b> · Elmmetrik Profil Sistemi · TURMARIN M1 Pilotu · Bakı 2026<br/>
          Açıq mənbə infrastrukturu: ORCID · OpenAlex · Crossref
        </div>
      </div>
    </>
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
