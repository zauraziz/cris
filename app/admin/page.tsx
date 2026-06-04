import { cookies } from "next/headers";
import crypto from "crypto";
import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE } from "@/lib/adda";
import FacultyAccordion, { FacultyStat } from "@/components/FacultyAccordion";
import ResearcherTable, { Researcher } from "@/components/ResearcherTable";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

function isAdmin(): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const token = cookies().get("adda_admin")?.value;
  if (!token) return false;
  const expected = crypto.createHash("sha256").update(pw).digest("hex");
  return token === expected;
}

type Row = Researcher & { i10_index: number; openalex_id: string | null };

async function getAll(): Promise<{ rows: Row[]; dbError: boolean }> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT full_name, email, orcid, openalex_id, works_count, citations, h_index, i10_index,
             scholar_id, researchgate, faculty, kafedra, position_title, updated_at
      FROM researchers
      ORDER BY citations DESC
    `) as Row[];
    return { rows, dbError: false };
  } catch (err) {
    console.error("[/admin] oxuma xətası:", err);
    return { rows: [], dbError: true };
  }
}

export default async function AdminPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const { rows, dbError } = await getAll();

  const totalResearchers = rows.length;
  const totalWorks = rows.reduce((s, r) => s + (r.works_count || 0), 0);
  const totalCitations = rows.reduce((s, r) => s + (r.citations || 0), 0);
  const maxHIndex = rows.reduce((m, r) => Math.max(m, r.h_index || 0), 0);
  const withOrcid = rows.filter((r) => r.orcid).length;
  const activeKafedras = new Set(rows.map((r) => r.faculty + "|" + r.kafedra)).size;
  const totalKafedras = Object.values(ADDA_STRUCTURE).reduce((s, ks) => s + ks.length, 0);

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
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div className="brand-txt"><b>İdarəetmə paneli</b><span>ADDA Elm Portalı · Admin</span></div>
          </div>
          <div className="topbar-spacer" />
          <a className="btn-ghost" href="/">İstifadəçi tərəfi</a>
          <AdminLogout />
        </div>
      </div>

      <div className="shell">
        <div className="page">
          <div className="page-head">
            <div className="eyebrow">İnstitusional analitika · tam</div>
            <h1>ADDA elmmetrik mənzərəsi</h1>
            <p>Bütün qeydiyyatlı tədqiqatçılar, fakültə/kafedra bölgüsü və fərdi göstəricilər. Məlumatlar real vaxtda yenilənir.</p>
          </div>

          {dbError && (
            <div className="note-strip" style={{ background: "#fdeeed", borderColor: "#f5c6c4", borderLeftColor: "#d9534f", color: "#a23b38" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.5 0z"/></svg>
              <span><b>Verilənlər bazasına bağlantı yoxdur.</b> DATABASE_URL mühit dəyişənini yoxlayın.</span>
            </div>
          )}

          <div className="note-strip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span>Elmmetrik göstəricilər (publikasiya, sitat, h-indeks) <b>OpenAlex</b> açıq bazasından real vaxtda alınır.</span>
          </div>

          <div className="kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <Kpi n={totalResearchers} l="Tədqiqatçı" path={<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>} />
            <Kpi n={totalWorks} l="Publikasiya" path={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />
            <Kpi n={totalCitations} l="Sitat" gold path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
            <Kpi n={maxHIndex} l="Ən yüksək h-indeks" gold path={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>} />
            <Kpi n={withOrcid} l="ORCID-li" path={<><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></>} />
            <Kpi n={`${activeKafedras}/${totalKafedras}`} l="Aktiv kafedra" path={<><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></>} />
          </div>

          <div className="dash-toolbar">
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>Fakültələr üzrə bölgü</div>
            <div className="legend"><span><i style={{ background: "var(--teal)" }} />Publikasiya həcmi (kafedra üzrə)</span></div>
          </div>

          <FacultyAccordion faculties={faculties} />

          <div className="dash-toolbar" style={{ marginTop: 30 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>Bütün tədqiqatçılar</div>
          </div>

          <ResearcherTable rows={rows} />

          {totalResearchers === 0 && !dbError && (
            <div style={{ textAlign: "center", padding: "26px 0", color: "var(--faint)", fontSize: 14 }}>
              Hələ heç bir tədqiqatçı qeydiyyatdan keçməyib.
            </div>
          )}
        </div>

        <div className="foot">
          <b>ADDA Elm Portalı</b> · İdarəetmə paneli · TURMARIN M1 Pilotu · Bakı 2026<br/>
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

function AdminLogout() {
  return (
    <form
      action={async () => {
        "use server";
        cookies().set("adda_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
      }}
    >
      <button className="btn-ghost" type="submit">Çıxış</button>
    </form>
  );
}
