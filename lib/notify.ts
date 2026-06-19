import { getSql, ensureSchema } from "@/lib/db";
import { sendMail, emailConfigured } from "@/lib/email";
import { tplAccountStrengthen, tplNewWorks, tplOrcidNudge, tplAreaSuggestion } from "@/lib/emailTemplates";
import { customAreaNames, suggestArea } from "@/lib/researchArea";

const SITE = process.env.NEXTAUTH_URL || "https://cris.adda.edu.az";
const MAILTO = "info@adda.edu.az";

function corporateDomains(): string[] {
  const env = process.env.CORPORATE_EMAIL_DOMAINS;
  if (env) return env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return ["adda.edu.az", "asco.az"];
}
function isCorporate(email: string | null): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const dom = email.slice(at + 1).toLowerCase();
  return corporateDomains().some((d) => dom === d || dom.endsWith("." + d));
}

async function recentTitles(openalexId: string | null, orcid: string | null): Promise<string[]> {
  const filter = openalexId
    ? `authorships.author.id:${openalexId.replace("https://openalex.org/", "")}`
    : orcid
    ? `authorships.author.orcid:${orcid}`
    : null;
  if (!filter) return [];
  try {
    const res = await fetch(
      `https://api.openalex.org/works?filter=${filter}&sort=publication_date:desc&per-page=5&select=display_name&mailto=${encodeURIComponent(MAILTO)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d?.results || []).map((w: any) => w.display_name).filter(Boolean).slice(0, 5);
  } catch {
    return [];
  }
}

type R = {
  id: number; full_name: string; email: string | null; orcid: string | null;
  openalex_id: string | null; works_count: number; notified_works_count: number | null;
  research_interests: string | null; email_opt_out: boolean;
};

export type NotifyResult = {
  ok: boolean; configured: boolean; scanned: number; eligible: number;
  sent: { welcome: number; newWorks: number; orcid: number; area: number };
  baseline: number; skipped: number; errors: number; elapsedMs: number;
};

export async function runNotifications(opts?: { limit?: number; maxEmails?: number; budgetMs?: number }): Promise<NotifyResult> {
  const start = Date.now();
  const budgetMs = opts?.budgetMs ?? 50_000;
  const maxEmails = opts?.maxEmails ?? 40;
  const limit = opts?.limit ?? 200;

  const res: NotifyResult = {
    ok: true, configured: emailConfigured(), scanned: 0, eligible: 0,
    sent: { welcome: 0, newWorks: 0, orcid: 0, area: 0 },
    baseline: 0, skipped: 0, errors: 0, elapsedMs: 0,
  };
  if (!res.configured) { res.ok = false; res.elapsedMs = Date.now() - start; return res; }

  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, full_name, email, orcid, openalex_id, works_count, notified_works_count, research_interests, email_opt_out
    FROM researchers
    WHERE (status = 'approved' OR status IS NULL) AND email IS NOT NULL AND email_opt_out = false
    ORDER BY updated_at DESC NULLS LAST
    LIMIT ${limit}
  `) as R[];

  let emailsSent = 0;

  async function already(rid: number, kind: string, ref: string): Promise<boolean> {
    const rr = (await sql`SELECT 1 FROM email_log WHERE researcher_id=${rid} AND kind=${kind} AND ref=${ref} AND ok=true LIMIT 1`) as any[];
    return rr.length > 0;
  }
  async function log(r: R, kind: string, ref: string, subject: string, s: { ok: boolean; error?: string }) {
    await sql`INSERT INTO email_log (researcher_id, email, kind, ref, subject, ok, error)
              VALUES (${r.id}, ${r.email}, ${kind}, ${ref}, ${subject}, ${s.ok}, ${s.error || null})`;
  }
  const profileUrl = (r: R) => (r.orcid ? `${SITE}/r/${encodeURIComponent(r.orcid)}` : `${SITE}/researchers`);

  for (const r of rows) {
    res.scanned++;
    if (Date.now() - start > budgetMs || emailsSent >= maxEmails) break;
    if (!isCorporate(r.email)) { res.skipped++; continue; }
    res.eligible++;
    const name = r.full_name || "həmkar";

    // 1) Hesabın gücləndirilməsi (bir dəfə)
    if (emailsSent < maxEmails && !(await already(r.id, "welcome", ""))) {
      const t = tplAccountStrengthen(name, profileUrl(r));
      const s = await sendMail(r.email!, t.subject, t.html);
      await log(r, "welcome", "", t.subject, s);
      if (s.ok) { res.sent.welcome++; emailsSent++; } else res.errors++;
    }

    // 2) ORCID tövsiyəsi (ORCID yoxdursa, bir dəfə)
    if (emailsSent < maxEmails && !r.orcid && !(await already(r.id, "orcid", ""))) {
      const t = tplOrcidNudge(name, profileUrl(r));
      const s = await sendMail(r.email!, t.subject, t.html);
      await log(r, "orcid", "", t.subject, s);
      if (s.ok) { res.sent.orcid++; emailsSent++; } else res.errors++;
    }

    // 3) Yeni nəşrlər: ilk görüşdə baseline qoy, sonra fərq olanda bildir
    if (r.notified_works_count == null) {
      await sql`UPDATE researchers SET notified_works_count=${r.works_count} WHERE id=${r.id}`;
      res.baseline++;
    } else if (r.works_count > r.notified_works_count && emailsSent < maxEmails) {
      if (!(await already(r.id, "newworks", String(r.works_count)))) {
        const delta = r.works_count - r.notified_works_count;
        const titles = await recentTitles(r.openalex_id, r.orcid);
        const t = tplNewWorks(name, delta, titles, profileUrl(r));
        const s = await sendMail(r.email!, t.subject, t.html);
        await log(r, "newworks", String(r.works_count), t.subject, s);
        if (s.ok) { res.sent.newWorks++; emailsSent++; await sql`UPDATE researchers SET notified_works_count=${r.works_count} WHERE id=${r.id}`; }
        else res.errors++;
      }
    }

    // 4) #5 — tədqiqat sahəsi tövsiyəsi (sərbəst daxil edilənlər; runda 1 termin)
    if (emailsSent < maxEmails) {
      for (const term of customAreaNames(r.research_interests)) {
        if (await already(r.id, "area", term)) continue;
        const sug = await suggestArea(term);
        if (sug) {
          const t = tplAreaSuggestion(name, term, sug.name, sug.field, profileUrl(r));
          const s = await sendMail(r.email!, t.subject, t.html);
          await log(r, "area", term, t.subject, s);
          if (s.ok) { res.sent.area++; emailsSent++; } else res.errors++;
        } else {
          await log(r, "area", term, "(uyğun tapılmadı)", { ok: true, error: "no_match" });
        }
        break; // runda yalnız bir sahə
      }
    }
  }

  res.elapsedMs = Date.now() - start;
  return res;
}
