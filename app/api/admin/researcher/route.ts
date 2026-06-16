import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isRector(req: NextRequest): boolean {
  const s = verifySession(req.cookies.get("adda_session")?.value);
  return !!(s && s.role === "rector");
}

// POST /api/admin/researcher  body { action: 'delete', id }
export async function POST(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }

  const id = parseInt(String(body.id), 10);
  const action = String(body.action || "");
  if (!Number.isFinite(id) || action !== "delete") {
    return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM researchers WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/admin/researcher]", err?.message);
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}
