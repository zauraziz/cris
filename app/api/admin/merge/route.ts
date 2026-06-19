import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isRector(req: NextRequest): boolean {
  const s = verifySession(req.cookies.get("adda_session")?.value);
  return !!(s && s.role === "rector");
}

type Row = Record<string, any>;

const TEXT_COLS = [
  "full_name", "name_en", "name_ru", "name_tr", "email", "orcid", "orcid_name", "openalex_id", "scholar_id",
  "researchgate", "faculty", "kafedra", "position_title", "photo", "bio",
  "research_interests", "linkedin", "website", "source",
];
const NUM_COLS = ["works_count", "citations", "h_index", "i10_index", "wos_works", "wos_citations", "wos_h_index"];

// POST /api/admin/merge — body { primaryId, mergeIds: number[] }
// primaryId saxlanılır, mergeIds onunla birləşdirilib silinir.
export async function POST(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }

  const primaryId = parseInt(String(body.primaryId), 10);
  const mergeIds: number[] = Array.isArray(body.mergeIds) ? body.mergeIds.map((x: any) => parseInt(String(x), 10)).filter((n: number) => Number.isFinite(n) && n !== primaryId) : [];
  if (!Number.isFinite(primaryId) || mergeIds.length === 0) {
    return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const allIds = [primaryId, ...mergeIds];
    const rows = (await sql`SELECT * FROM researchers WHERE id = ANY(${allIds})`) as Row[];
    const primary = rows.find((r) => r.id === primaryId);
    if (!primary) return NextResponse.json({ ok: false, error: "notfound" }, { status: 404 });
    const others = rows.filter((r) => r.id !== primaryId);

    const merged: Row = {};
    // Mətn sütunları: primary boşdursa, digərlərindən ilk dolu dəyəri götür
    for (const c of TEXT_COLS) {
      let v = primary[c];
      if (v === null || v === undefined || String(v).trim() === "") {
        for (const o of others) {
          if (o[c] !== null && o[c] !== undefined && String(o[c]).trim() !== "") { v = o[c]; break; }
        }
      }
      merged[c] = v ?? null;
    }
    // Ədədi göstəricilər: ən böyük dəyəri götür
    for (const c of NUM_COLS) {
      let v = Number(primary[c] || 0);
      for (const o of others) v = Math.max(v, Number(o[c] || 0));
      merged[c] = v;
    }

    await sql`
      UPDATE researchers SET
        full_name = ${merged.full_name},
        name_en = ${merged.name_en},
        name_ru = ${merged.name_ru},
        name_tr = ${merged.name_tr},
        email = ${merged.email},
        orcid = ${merged.orcid},
        orcid_name = ${merged.orcid_name},
        openalex_id = ${merged.openalex_id},
        scholar_id = ${merged.scholar_id},
        researchgate = ${merged.researchgate},
        faculty = ${merged.faculty},
        kafedra = ${merged.kafedra},
        position_title = ${merged.position_title},
        photo = ${merged.photo},
        bio = ${merged.bio},
        research_interests = ${merged.research_interests},
        linkedin = ${merged.linkedin},
        website = ${merged.website},
        works_count = ${merged.works_count},
        citations = ${merged.citations},
        h_index = ${merged.h_index},
        i10_index = ${merged.i10_index},
        wos_works = ${merged.wos_works},
        wos_citations = ${merged.wos_citations},
        wos_h_index = ${merged.wos_h_index},
        status = 'approved',
        updated_at = now()
      WHERE id = ${primaryId}
    `;
    await sql`DELETE FROM researchers WHERE id = ANY(${mergeIds})`;

    return NextResponse.json({ ok: true, merged: mergeIds.length });
  } catch (err: any) {
    console.error("[/api/admin/merge]", err?.message);
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}
