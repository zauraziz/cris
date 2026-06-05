import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { fetchOpenAlexByOrcid } from "@/lib/openalex";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// İcazə: ya Vercel Cron (Authorization: Bearer CRON_SECRET),
// ya da admin paneldən rektor (tam) sessiyası ilə əl ilə.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;

  const session = verifySession(req.cookies.get("adda_session")?.value);
  if (session && session.role === "rector") return true;

  return false;
}

async function refresh(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "300", 10)));
  const start = Date.now();
  const BUDGET_MS = 50_000; // maxDuration 60s-dən əvvəl təmiz dayan
  const BATCH = 8;

  let scanned = 0, updated = 0, notFound = 0, errors = 0, total = 0;

  try {
    await ensureSchema();
    const sql = getSql();
    // Ən köhnə yenilənmişlər əvvəl — vaxt limiti olsa belə növbəti dəfə davam edir
    const rows = (await sql`
      SELECT email, orcid FROM researchers
      WHERE orcid IS NOT NULL AND orcid <> ''
      ORDER BY updated_at ASC NULLS FIRST
      LIMIT ${limit}
    `) as { email: string; orcid: string }[];
    total = rows.length;

    for (let i = 0; i < rows.length; i += BATCH) {
      if (Date.now() - start > BUDGET_MS) break;
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (r) => {
          scanned++;
          try {
            const oa = await fetchOpenAlexByOrcid(r.orcid);
            if (oa.found) {
              await sql`
                UPDATE researchers SET
                  openalex_id = ${oa.openalexId},
                  works_count = ${oa.worksCount},
                  citations   = ${oa.citations},
                  h_index     = ${oa.hIndex},
                  i10_index   = ${oa.i10Index},
                  updated_at  = now()
                WHERE email = ${r.email}
              `;
              updated++;
            } else {
              notFound++;
            }
          } catch {
            errors++;
          }
        })
      );
    }

    return NextResponse.json({
      ok: true,
      total,
      scanned,
      updated,
      notFound,
      errors,
      elapsedMs: Date.now() - start,
    });
  } catch (err: any) {
    console.error("[/api/cron/refresh] xəta:", err?.message);
    return NextResponse.json(
      { ok: false, error: "server", message: err?.message, scanned, updated },
      { status: 500 }
    );
  }
}

// Vercel Cron GET göndərir; admin paneldən POST ilə çağırılır.
export async function GET(req: NextRequest) {
  return refresh(req);
}
export async function POST(req: NextRequest) {
  return refresh(req);
}
