import { NextRequest, NextResponse } from "next/server";
import { signSession, staffAccounts, verifyPassword, type Session } from "@/lib/auth";
import { getSql, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/admin/login  { username?, password }
// - Rektor: ADMIN_PASSWORD (istifadəçi adı boş və ya "rektor"/"admin")
// - Dekan / kafedra müdiri: STAFF_ACCOUNTS-dakı hesablar (istifadəçi adı + parol)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!password) {
    return NextResponse.json({ ok: false, message: "Parol tələb olunur." }, { status: 400 });
  }

  let session: Session | null = null;

  // 1) Rektor / Administrator (ADMIN_PASSWORD)
  const adminPw = process.env.ADMIN_PASSWORD;
  const rectorNames = ["", "rektor", "admin", "administrator", "rector"];
  if (adminPw && password === adminPw && rectorNames.includes(username.toLowerCase())) {
    session = { role: "rector", name: "Rektor / Administrator" };
  }

  // 2) İşçi hesabları (dekan / kafedra müdiri) — env STAFF_ACCOUNTS
  if (!session) {
    const acc = staffAccounts().find(
      (a) => a.user.toLowerCase() === username.toLowerCase() && a.pass === password
    );
    if (acc) {
      session = {
        role: acc.role,
        faculty: acc.faculty,
        kafedra: acc.kafedra,
        name: acc.name || acc.user,
      };
    }
  }

  // 3) Dinamik admin hesabları (bazada — kafedra müdirləri)
  if (!session && username) {
    try {
      await ensureSchema();
      const sql = getSql();
      const rows = (await sql`
        SELECT username, pass_hash, role, faculty, kafedra, name
        FROM admin_accounts WHERE lower(username) = ${username.toLowerCase()} LIMIT 1
      `) as { username: string; pass_hash: string; role: string; faculty: string | null; kafedra: string | null; name: string | null }[];
      const acc = rows[0];
      if (acc && verifyPassword(password, acc.pass_hash)) {
        session = {
          role: acc.role as Session["role"],
          faculty: acc.faculty || undefined,
          kafedra: acc.kafedra || undefined,
          name: acc.name || acc.username,
        };
      }
    } catch {
      // baza əlçatmazsa keç
    }
  }

  if (!session) {
    return NextResponse.json({ ok: false, message: "İstifadəçi adı və ya parol yanlışdır." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: session.role });
  res.cookies.set("adda_session", signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("adda_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
