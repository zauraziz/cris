import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession, hashPassword } from "@/lib/auth";
import { ADDA_STRUCTURE } from "@/lib/adda";

export const dynamic = "force-dynamic";

function isRector(req: NextRequest): boolean {
  const s = verifySession(req.cookies.get("adda_session")?.value);
  return !!(s && s.role === "rector");
}

// GET — hesabların siyahısı (parolsuz)
export async function GET(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT id, username, role, faculty, kafedra, name, created_at FROM admin_accounts ORDER BY created_at DESC`;
    return NextResponse.json({ ok: true, accounts: rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}

// POST — yeni hesab { username, password, role, faculty?, kafedra?, name? }
export async function POST(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "head");
  const faculty = body.faculty ? String(body.faculty).trim() : null;
  const kafedra = body.kafedra ? String(body.kafedra).trim() : null;
  const name = body.name ? String(body.name).trim() : null;

  if (username.length < 3 || password.length < 6 || !["head", "dean"].includes(role)) {
    return NextResponse.json({ ok: false, message: "İstifadəçi adı (≥3) və parol (≥6) tələb olunur." }, { status: 400 });
  }
  // Struktur yoxlaması
  if (role === "dean" && (!faculty || !ADDA_STRUCTURE[faculty])) {
    return NextResponse.json({ ok: false, message: "Dekan üçün düzgün fakültə seçilməlidir." }, { status: 400 });
  }
  if (role === "head" && (!faculty || !ADDA_STRUCTURE[faculty] || !kafedra || !ADDA_STRUCTURE[faculty].includes(kafedra))) {
    return NextResponse.json({ ok: false, message: "Kafedra müdiri üçün fakültə və kafedra düzgün olmalıdır." }, { status: 400 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const exists = (await sql`SELECT 1 FROM admin_accounts WHERE lower(username) = ${username.toLowerCase()} LIMIT 1`) as any[];
    if (exists.length > 0) {
      return NextResponse.json({ ok: false, message: "Bu istifadəçi adı artıq mövcuddur." }, { status: 409 });
    }
    const passHash = hashPassword(password);
    await sql`
      INSERT INTO admin_accounts (username, pass_hash, role, faculty, kafedra, name)
      VALUES (${username}, ${passHash}, ${role}, ${faculty}, ${kafedra}, ${name})
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[/api/admin/accounts POST]", err?.message);
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}

// DELETE — hesabı sil { id }
export async function DELETE(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }
  const id = parseInt(String(body.id), 10);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM admin_accounts WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "db", message: err?.message }, { status: 500 });
  }
}
