import { cookies } from "next/headers";
import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE, ADDA_ROR, ADDA_ROR_URL, POSITIONS } from "@/lib/adda";
import { fetchInstitutionByRor } from "@/lib/openalex";
import HarvestButton from "@/components/HarvestButton";
import ModerationQueue, { PendingItem } from "@/components/ModerationQueue";
import { verifySession, roleLabel, scopeLabel, type Session } from "@/lib/auth";
import FacultyAccordion, { FacultyStat } from "@/components/FacultyAccordion";
import ResearcherTable, { Researcher } from "@/components/ResearcherTable";
import AdminLogin from "@/components/AdminLogin";
import RefreshButton from "@/components/RefreshButton";
import WosRefreshButton from "@/components/WosRefreshButton";

export const dynamic = "force-dynamic";

type Row = Researcher & {
  i10_index: number;
  openalex_id: string | null;
  wos_works: number;
  wos_checked_at: string | null;
};

async function getAll(): Promise<{ rows: Row[]; dbError: boolean }> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT full_name, email, orcid, openalex_id, works_count, citations, h_index, i10_index,
             wos_works, wos_citations, wos_h_index, wos_checked_at,
             scholar_id, researchgate, faculty, kafedra, position_title, updated_at
      FROM researchers
      WHERE status = 'approved' OR status IS NULL
      ORDER BY citations DESC
    `) as Row[];
    return { rows, dbError: false };
  } catch (err) {
    console.error("[/admin] oxuma xətası:", err);
    return { rows: [], dbError: true };
  }
}

async function getPending(): Promise<PendingItem[]> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT id, full_name, orcid, works_count, citations, h_index
      FROM researchers
      WHERE status = 'pending'
      ORDER BY works_count DESC
      LIMIT 500
    `) as PendingItem[];
    return rows;
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const session = verifySession(cookies().get("adda_session")?.value);
  if (!session) {
    return <AdminLogin />;
  }

  const { rows: allRows, dbError } = await getAll();

  // Rola görə əhatə (scope)
  const isRector = session.role === "rector";

  // ADDA-nın OpenAlex institusional profili (ROR üzrə) — yalnız rektor görünüşündə
  const inst = isRector ? await fetchInstitutionByRor(ADDA_ROR) : null;
  const pending = isRector ? await getPending() : [];
  const rows =
    session.role === "dean"
      ? allRows.filter((r) => r.faculty === session.faculty)
      : session.role === "head"
      ? allRows.filter((r) => r.faculty === session.faculty && r.kafedra === session.kafedra)
      : allRows;

  // Görünən fakültə/kafedra strukturu
  let structureEntries = Object.entries(ADDA_STRUCTURE);
  if (session.role === "dean") {
    structureEntries = structureEntries.filter(([f]) => f === session.faculty);
  } else if (session.role === "head") {
    structureEntries = structureEntries
      .filter(([f]) => f === session.faculty)
      .map(([f, ks]) => [f, ks.filter((k) => k === session.kafedra)] as [string, string[]]);
  }

  const totalResearchers = rows.length;
  const totalWorks = rows.reduce((s, r) => s + (r.works_count || 0), 0);
  const totalCitations = rows.reduce((s, r) => s + (r.citations || 0), 0);
  const maxHIndex = rows.reduce((m, r) => Math.max(m, r.h_index || 0), 0);
  const withOrcid = rows.filter((r) => r.orcid).length;
  const activeKafedras = new Set(rows.map((r) => r.faculty + "|" + r.kafedra)).size;
  const totalKafedras = structureEntries.reduce((s, [, ks]) => s + ks.length, 0);
  const totalWosCitations = rows.reduce((s, r) => s + (r.wos_citations || 0), 0);
  const wosChecked = rows.filter((r) => r.wos_checked_at).length;

  const faculties: FacultyStat[] = structureEntries.map(([fac, kafedras]) => {
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
          <div className="role-chip">
            <span className="role-dot" data-role={session.role} />
            <span><b>{roleLabel(session)}</b>{!isRector && <> · {scopeLabel(session)}</>}</span>
          </div>
          <a className="btn-ghost" href="/">İstifadəçi tərəfi</a>
          <AdminLogout />
        </div>
      </div>

      <div className="shell">
        <div className="page">
          <div className="page-head">
            <div className="eyebrow">{isRector ? "İnstitusional analitika · tam" : roleLabel(session) + " görünüşü"}</div>
            <h1>{isRector ? "ADDA elmmetrik mənzərəsi" : scopeLabel(session)}</h1>
            <p>
              {isRector
                ? "Bütün qeydiyyatlı tədqiqatçılar, fakültə/kafedra bölgüsü və fərdi göstəricilər."
                : session.role === "dean"
                ? "Fakültənizin kafedraları üzrə tədqiqatçılar və elmmetrik göstəriciləri."
                : "Kafedranızın tədqiqatçıları və elmmetrik göstəriciləri."}
            </p>
          </div>

          {dbError && (
            <div className="note-strip" style={{ background: "#fdeeed", borderColor: "#f5c6c4", borderLeftColor: "#d9534f", color: "#a23b38" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.5 0z"/></svg>
              <span><b>Verilənlər bazasına bağlantı yoxdur.</b> DATABASE_URL mühit dəyişənini yoxlayın.</span>
            </div>
          )}

          <div className="note-strip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span>Elmmetrik göstəricilər (publikasiya, sitat, h-indeks) <b>OpenAlex</b> açıq bazasından real vaxtda alınır. <b>WoS</b> sütunu Web of Science-dən əl ilə yenilənir (rəsmi indeks).</span>
          </div>

          {isRector && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                Göstəricilər hər gün avtomatik yenilənir (Vercel Cron). Dərhal yeniləmək üçün:
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <RefreshButton />
                <WosRefreshButton />
              </div>
            </div>
          )}

          <div className="kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <Kpi n={totalResearchers} l="Tədqiqatçı" path={<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>} />
            <Kpi n={totalWorks} l="Publikasiya" path={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />
            <Kpi n={totalCitations} l="Sitat · OpenAlex" gold path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
            <Kpi n={maxHIndex} l="Ən yüksək h-indeks" gold path={<><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></>} />
            <Kpi n={totalWosCitations} l="Sitat · WoS" path={<><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></>} />
            <Kpi n={withOrcid} l="ORCID-li" path={<><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></>} />
            <Kpi n={`${activeKafedras}/${totalKafedras}`} l="Aktiv kafedra" path={<><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></>} />
          </div>

          {isRector && inst && (
            <div className="inst-panel">
              <div className="inst-head">
                <div>
                  <div className="inst-title">ADDA · OpenAlex institusional profil</div>
                  <div className="inst-sub">OpenAlex-in ROR identifikatoru vasitəsilə Akademiyaya aid etdiyi açıq elmi iz</div>
                </div>
                <a className="ror-badge" href={ADDA_ROR_URL} target="_blank" rel="noreferrer">
                  <span className="ror-r">ROR</span> {ADDA_ROR}
                </a>
              </div>
              {inst.found ? (
                <>
                  <div className="inst-stats">
                    <div className="inst-stat"><div className="is-n">{inst.worksCount.toLocaleString("az-AZ")}</div><div className="is-l">Publikasiya</div></div>
                    <div className="inst-stat"><div className="is-n gold">{inst.citations.toLocaleString("az-AZ")}</div><div className="is-l">Sitat</div></div>
                    <div className="inst-stat"><div className="is-n gold">{inst.hIndex}</div><div className="is-l">h-indeks</div></div>
                    <div className="inst-stat"><div className="is-n">{inst.i10Index}</div><div className="is-l">i10-indeks</div></div>
                  </div>
                  <div className="inst-note">
                    Bu rəqəmlər OpenAlex-də <b>{inst.displayName || "ADDA"}</b> institutuna aid edilmiş bütün işlərə əsaslanır (yalnız portala qeydiyyatdan keçənlər deyil). <b>Webometrics-in şəffaflıq göstəricisi məhz bu mənbədən — ROR ilə — qidalanır.</b> Tədqiqatçıların mənsubiyyəti düzgün göstərildikcə bu rəqəmlər artacaq.
                  </div>
                </>
              ) : (
                <div className="inst-note">OpenAlex institut profili hazırda yüklənə bilmədi. Bir azdan yenidən cəhd edin.</div>
              )}
            </div>
          )}

          {isRector && (
            <div className="harvest-block">
              <div className="dash-toolbar" style={{ marginTop: 4 }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>
                  Müəlliflərin import-u və moderasiya
                  {pending.length > 0 && <span className="pending-badge">{pending.length} təsdiq gözləyir</span>}
                </div>
              </div>
              <div className="harvest-intro">
                OpenAlex-də ADDA-ya (ROR <b>{ADDA_ROR}</b>) aid edilmiş müəllifləri avtomatik gətirin. İdxal olunanlar <b>«təsdiq gözləyir»</b> statusu ilə gəlir; siz fakültə/kafedra təyin edib təsdiqləyənə qədər ictimai reyestrdə görünmür.
              </div>
              <HarvestButton />
              <div style={{ marginTop: 18 }}>
                <ModerationQueue items={pending} structure={ADDA_STRUCTURE} positions={POSITIONS} />
              </div>
            </div>
          )}

          <div className="dash-toolbar">
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>
              {session.role === "head" ? "Kafedra göstəriciləri" : "Fakültə üzrə bölgü"}
            </div>
            <div className="legend"><span><i style={{ background: "var(--teal)" }} />Publikasiya həcmi (kafedra üzrə)</span></div>
          </div>

          <FacultyAccordion faculties={faculties} />

          <div className="dash-toolbar" style={{ marginTop: 30 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, color: "var(--navy)", fontWeight: 600 }}>
              {isRector ? "Bütün tədqiqatçılar" : session.role === "dean" ? "Fakültə tədqiqatçıları" : "Kafedra tədqiqatçıları"}
            </div>
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
        cookies().set("adda_session", "", { httpOnly: true, path: "/", maxAge: 0 });
      }}
    >
      <button className="btn-ghost" type="submit">Çıxış</button>
    </form>
  );
}
