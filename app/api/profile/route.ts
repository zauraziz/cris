import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { isValidAddaEmail, ADDA_STRUCTURE } from "@/lib/adda";

export const dynamic = "force-dynamic";

// GET /api/profile?email=... — mövcud profili gətirir (redaktə üçün)
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("email") || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, found: false });
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`SELECT * FROM researchers WHERE email = ${email} LIMIT 1`) as any[];
    if (!rows.length) return NextResponse.json({ ok: true, found: false });
    return NextResponse.json({ ok: true, found: true, profile: rows[0] });
  } catch (err: any) {
    console.error("[/api/profile GET] xəta:", err?.message);
    return NextResponse.json({ ok: false, found: false, message: err?.message }, { status: 500 });
  }
}

// POST /api/profile — tədqiqatçı profilini bazaya əlavə/yeniləyir (upsert).
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const email = String(body.email || "").toLowerCase().trim();
  const fullName = String(body.full_name || "").trim();
  const faculty = String(body.faculty || "").trim();
  const kafedra = String(body.kafedra || "").trim();

  // Validasiya
  if (!isValidAddaEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "email", message: "ADDA korporativ e-poçtu tələb olunur." },
      { status: 400 }
    );
  }
  if (fullName.length < 3) {
    return NextResponse.json(
      { ok: false, error: "name", message: "Ad tələb olunur." },
      { status: 400 }
    );
  }
  if (!ADDA_STRUCTURE[faculty] || !ADDA_STRUCTURE[faculty].includes(kafedra)) {
    return NextResponse.json(
      { ok: false, error: "structure", message: "Fakültə/kafedra düzgün deyil." },
      { status: 400 }
    );
  }

  const orcid = body.orcid ? String(body.orcid).toUpperCase().trim() : null;
  const orcidName = body.orcid_name ? String(body.orcid_name).trim() : null;
  const works = Number.isFinite(body.works_count) ? Number(body.works_count) : 0;
  const citations = Number.isFinite(body.citations) ? Number(body.citations) : 0;
  const hIndex = Number.isFinite(body.h_index) ? Number(body.h_index) : 0;
  const i10 = Number.isFinite(body.i10_index) ? Number(body.i10_index) : 0;
  const openalexId = body.openalex_id ? String(body.openalex_id).trim() : null;
  const scholar = body.scholar_id ? String(body.scholar_id).trim() : null;
  const rg = body.researchgate ? String(body.researchgate).trim() : null;
  const position = body.position_title ? String(body.position_title).trim() : null;

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO researchers
        (email, full_name, orcid, orcid_name, openalex_id, works_count, citations, h_index, i10_index, scholar_id, researchgate, faculty, kafedra, position_title, updated_at)
      VALUES
        (${email}, ${fullName}, ${orcid}, ${orcidName}, ${openalexId}, ${works}, ${citations}, ${hIndex}, ${i10}, ${scholar}, ${rg}, ${faculty}, ${kafedra}, ${position}, now())
      ON CONFLICT (email) DO UPDATE SET
        full_name      = EXCLUDED.full_name,
        orcid          = EXCLUDED.orcid,
        orcid_name     = EXCLUDED.orcid_name,
        openalex_id    = EXCLUDED.openalex_id,
        works_count    = EXCLUDED.works_count,
        citations      = EXCLUDED.citations,
        h_index        = EXCLUDED.h_index,
        i10_index      = EXCLUDED.i10_index,
        scholar_id     = EXCLUDED.scholar_id,
        researchgate   = EXCLUDED.researchgate,
        faculty        = EXCLUDED.faculty,
        kafedra        = EXCLUDED.kafedra,
        position_title = EXCLUDED.position_title,
        updated_at     = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Vercel runtime log-larında görünsün ki, diaqnostika asan olsun
    console.error("[/api/profile] INSERT xətası:", err?.message, err);
    return NextResponse.json(
      { ok: false, error: "db", message: err?.message || "Baza xətası." },
      { status: 500 }
    );
  }
}
