import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { ADDA_STRUCTURE } from "@/lib/adda";

export const dynamic = "force-dynamic";

function isRector(req: NextRequest): boolean {
  const session = verifySession(req.cookies.get("adda_session")?.value);
  return !!(session && session.role === "rector");
}

// POST /api/admin/moderate — harvest edilmiş tədqiqatçını təsdiqlə / rədd et
// body: { id, action: 'approve'|'reject', faculty?, kafedra?, position_title? }
export async function POST(req: NextRequest) {
  if (!isRector(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "json" }, { status: 400 });
  }

  const id = parseInt(String(body.id), 10);
  const action = String(body.action || "");
  if (!Number.isFinite(id) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    if (action === "reject") {
      await sql`DELETE FROM researchers WHERE id = ${id} AND status = 'pending'`;
      return NextResponse.json({ ok: true, action: "reject" });
    }

    // approve — kafedra/fakültə təyini (varsa)
    const faculty = body.faculty ? String(body.faculty).trim() : null;
    const kafedra = body.kafedra ? String(body.kafedra).trim() : null;
    const position = body.position_title ? String(body.position_title).trim() : null;

    if (faculty && (!ADDA_STRUCTURE[faculty] || (kafedra && !ADDA_STRUCTURE[faculty].includes(kafedra)))) {
      return NextResponse.json({ ok: false, error: "structure", message: "Fakültə/kafedra düzgün deyil." }, { status: 400 });
    }

    await sql`
      UPDATE researchers
         SET status = 'approved',
          faculty = COALESCE(${faculty}, faculty),
          kafedra = COALESCE(${kafedra}, kafedra),
          position_title = COALESCE(${position}, position_title),
          updated_at = now()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true, action: "approve" });
  } catch (err: any) {
    console.error("[/api/admin/moderate] xəta:", err?.message);
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}
