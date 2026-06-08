import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { fetchWosForOrcid, wosConfigured } from "@/lib/wos";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// İcazə: Bearer CRON_SECRET və ya rektor (tam) sessiyası.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;
  const session = verifySession(req.cookies.get("adda_session")?.value);
  return !!(session && session.role === "rector");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pulsuz plan: 50 sorğu/gün, 1 sorğu/saniyə.
// Hər çağırışda ən köhnə yoxlanmış ≤20 tədqiqatçını emal edirik (resumable).
async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!wosConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: "WOS_API_KEY təyin edilməyib." },
      { status: 200 }
    );
  }

  const url = new URL(req.url);
  const cap = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10)));

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT email, orcid FROM researchers
      WHERE orcid IS NOT NULL AND orcid <> ''
      ORDER BY wos_checked_at ASC NULLS FIRST, updated_at ASC
      LIMIT ${cap}
    `) as { email: string; orcid: string }[];

    const start = Date.now();
    let scanned = 0;
    let updated = 0;
    let withData = 0;
    let citationsAvailable = false;

    for (const r of rows) {
      if (Date.now() - start > 50000) break; // vaxt büdcəsi
      scanned++;
      const stats = await fetchWosForOrcid(r.orcid);
      if (stats.hasCitations) citationsAvailable = true;
      if (stats.found) withData++;

      await sql`
        UPDATE researchers
        SET wos_works = ${stats.works},
            wos_citations = ${stats.citations},
            wos_h_index = ${stats.hIndex},
            wos_checked_at = NOW()
        WHERE email = ${r.email}
      `;
      updated++;
      await sleep(1100); // 1 sorğu/saniyə limitinə hörmət
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      scanned,
      updated,
      withData,
      citationsAvailable,
      note: citationsAvailable
        ? "WoS sitat sayları mövcuddur."
        : "Bu sorğuda sitat sayı gəlmədi (pulsuz plan sitatı qaytarmaya bilər və ya əsərlər WoS-da indekslənməyib).",
      elapsedMs: Date.now() - start,
    });
  } catch (err) {
    console.error("[/api/wos/refresh] xəta:", err);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
