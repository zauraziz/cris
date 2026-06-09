import { getSql, ensureSchema } from "@/lib/db";
import { ADDA_STRUCTURE } from "@/lib/adda";
import PublicDirectory, { type DirItem } from "@/components/PublicDirectory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tədqiqatçılar — ADDA Elm Portalı (CRIS)",
  description: "Azərbaycan Dövlət Dəniz Akademiyasının tədqiqatçıları — elmmetrik profillər, tədqiqat sahələri və göstəricilər.",
};

async function getApproved(): Promise<DirItem[]> {
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT full_name, orcid, faculty, kafedra, position_title,
             works_count, citations, h_index, photo, research_interests
      FROM researchers
      WHERE (status = 'approved' OR status IS NULL)
      ORDER BY citations DESC, works_count DESC
    `) as DirItem[];
    return rows;
  } catch {
    return [];
  }
}

export default async function ResearchersPage() {
  const items = await getApproved();
  const totalPubs = items.reduce((s, r) => s + (r.works_count || 0), 0);
  const totalCit = items.reduce((s, r) => s + (r.citations || 0), 0);
  const faculties = Object.keys(ADDA_STRUCTURE);
  const activeFaculties = new Set(items.map((r) => r.faculty).filter(Boolean)).size;

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
          <a className="back-link" href="/" style={{ textDecoration: "none" }}>Daxil ol →</a>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 26 }}>
        <div className="page-head">
          <div className="eyebrow">Tədqiqatçılar</div>
          <h1>Akademiyanın elmi icması</h1>
          <p>Azərbaycan Dövlət Dəniz Akademiyasının tədqiqatçıları, elmmetrik göstəriciləri və tədqiqat sahələri.</p>
        </div>

        {/* İctimai statistika (AVESIS üslubu) */}
        <div className="dir-stats">
          <div className="dir-stat"><div className="ds-n">{items.length}</div><div className="ds-l">Tədqiqatçı</div></div>
          <div className="dir-stat"><div className="ds-n">{totalPubs.toLocaleString("az-AZ")}</div><div className="ds-l">Publikasiya</div></div>
          <div className="dir-stat"><div className="ds-n gold">{totalCit.toLocaleString("az-AZ")}</div><div className="ds-l">Sitat</div></div>
          <div className="dir-stat"><div className="ds-n">{activeFaculties}/{faculties.length}</div><div className="ds-l">Fakültə</div></div>
        </div>

        {items.length === 0 ? (
          <div className="card"><div className="card-pad" style={{ textAlign: "center", color: "var(--faint)" }}>
            Hələlik təsdiqlənmiş tədqiqatçı yoxdur.
          </div></div>
        ) : (
          <PublicDirectory items={items} faculties={faculties} />
        )}

        <div className="foot">
          <b>ADDA Elm Portalı</b> — Current Research Information System · Cari Tədqiqat İnformasiya Sistemi (CRIS)<br/>
          Açıq mənbə infrastrukturu: ORCID · OpenAlex · Crossref · Bakı 2026
        </div>
      </div>
    </div>
  );
}
