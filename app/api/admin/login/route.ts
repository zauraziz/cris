import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// POST /api/admin/login  { password }
// ADMIN_PASSWORD mühit dəyişəni ilə müqayisə edir, uğurlu olduqda
// httpOnly cookie qoyur. (Pilot üçün sadə qapı — istehsalda gücləndirilməli.)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_PASSWORD təyin edilməyib (Vercel mühit dəyişənləri)." },
      { status: 500 }
    );
  }

  if (String(body.password || "") !== pw) {
    return NextResponse.json({ ok: false, message: "Parol yanlışdır." }, { status: 401 });
  }

  const token = crypto.createHash("sha256").update(pw).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("adda_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 saat
  });
  return res;
}

// POST /api/admin/login/logout üçün — sadəlik naminə DELETE ilə çıxış
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("adda_admin", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
