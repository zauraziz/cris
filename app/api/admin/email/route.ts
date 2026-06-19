import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { sendMail, emailConfigured, emailSender } from "@/lib/email";
import { runNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isRector(req: NextRequest): boolean {
  const s = verifySession(req.cookies.get("adda_session")?.value);
  return !!(s && s.role === "rector");
}

export async function GET(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, configured: emailConfigured(), sender: emailSender() });
}

export async function POST(req: NextRequest) {
  if (!isRector(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }
  const action = String(body.action || "");

  if (action === "test") {
    if (!emailConfigured()) return NextResponse.json({ ok: false, error: "not_configured", message: "Graph email konfiqurasiya olunmayıb (AZURE_AD_* + GRAPH_SENDER)." }, { status: 400 });
    const to = String(body.to || "").trim();
    if (!to.includes("@")) return NextResponse.json({ ok: false, error: "input", message: "Düzgün e-poçt daxil edin." }, { status: 400 });
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0A2540">
      <h2>Test bildirişi ✓</h2>
      <p>ADDA Elm Portalı — Microsoft 365 (Graph) email inteqrasiyası işləyir.</p>
      <p style="color:#8a97a4;font-size:13px">Göndərən: ${emailSender()}</p></div>`;
    const r = await sendMail(to, "ADDA Elm Portalı — test bildirişi", html);
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }

  if (action === "run") {
    const result = await runNotifications({});
    return NextResponse.json(result, { status: result.configured ? 200 : 400 });
  }

  return NextResponse.json({ ok: false, error: "input" }, { status: 400 });
}
