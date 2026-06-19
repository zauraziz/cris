import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isRector(req: NextRequest): boolean {
  const s = verifySession(req.cookies.get("adda_session")?.value);
  return !!(s && s.role === "rector");
}

// Redaktə edilə bilən sahələr (OpenAlex metrikləri toxunulmur)
const EDITABLE = [
  "full_name", "name_en", "name_ru", "name_tr",
  "email", "orcid", "openalex_id", "scholar_id", "researchgate",
  "faculty", "kafedra", "position_title",
  "photo", "bio", "research_interests", "linkedin", "website",
] as const;

const norm = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

// GET /api/admin/researcher?id=N — redaktə üçün tam qeyd
export async function GET(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = parseInt(String(req.nextUrl.searchParams.get("id") || ""), 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT id, full_name, name_en, name_ru, name_tr, email, orcid, openalex_id,
             scholar_id, researchgate, faculty, kafedra, position_title,
             photo, bio, research_interests, linkedin, website, status, source,
             works_count, citations, h_index
      FROM researchers WHERE id = ${id} LIMIT 1
    `) as any[];
    if (!rows[0]) return NextResponse.json({ ok: false, error: "notfound" }, { status: 404 });
    return NextResponse.json({ ok: true, researcher: rows[0] });
  } catch (err: any) {
    console.error("[/api/admin/researcher GET]", err?.message);
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}

// POST /api/admin/researcher
//   { action: 'delete', id }
//   { action: 'update', id, full_name, name_en, ... }
export async function POST(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }

  const id = parseInt(String(body.id), 10);
  const action = String(body.action || "");
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "input" }, { status: 400 });

  try {
    await ensureSchema();
    const sql = getSql();

    if (action === "delete") {
      await sql`DELETE FROM researchers WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const fullName = norm(body.full_name);
      if (!fullName) return NextResponse.json({ ok: false, error: "name", message: "Ad boş ola bilməz." }, { status: 400 });

      // Yalnız icazəli sahələri topla
      const vals: Record<string, string | null> = {};
      for (const f of EDITABLE) vals[f] = norm(body[f]);
      vals.full_name = fullName;

      await sql`
        UPDATE researchers SET
          full_name = ${vals.full_name},
          name_en = ${vals.name_en},
          name_ru = ${vals.name_ru},
          name_tr = ${vals.name_tr},
          email = ${vals.email},
          orcid = ${vals.orcid},
          openalex_id = ${vals.openalex_id},
          scholar_id = ${vals.scholar_id},
          researchgate = ${vals.researchgate},
          faculty = ${vals.faculty},
          kafedra = ${vals.kafedra},
          position_title = ${vals.position_title},
          photo = ${vals.photo},
          bio = ${vals.bio},
          research_interests = ${vals.research_interests},
          linkedin = ${vals.linkedin},
          website = ${vals.website},
          updated_at = now()
        WHERE id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/admin/researcher POST]", err?.message);
    const msg = /unique/i.test(err?.message || "") ? "Bu e-poçt artıq başqa profildə istifadə olunur." : err?.message;
    return NextResponse.json({ ok: false, error: "db", message: msg }, { status: 500 });
  }
}
