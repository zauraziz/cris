import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { runNotifications } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// İcazə: Vercel Cron (Authorization: Bearer CRON_SECRET) və ya rektor sessiyası.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;
  const session = verifySession(req.cookies.get("adda_session")?.value);
  return !!(session && session.role === "rector");
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "200", 10)));
  const maxEmails = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("max") || "40", 10)));
  const result = await runNotifications({ limit, maxEmails });
  const status = result.configured ? 200 : 503;
  return NextResponse.json(result, { status });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
