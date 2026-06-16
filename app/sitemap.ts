import type { MetadataRoute } from "next";
import { getSql, ensureSchema } from "@/lib/db";

const SITE = "https://cris.adda.edu.az";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/researchers`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT orcid, updated_at FROM researchers
      WHERE (status = 'approved' OR status IS NULL) AND orcid IS NOT NULL AND orcid <> ''
    `) as { orcid: string; updated_at: string | null }[];
    for (const r of rows) {
      base.push({
        url: `${SITE}/r/${r.orcid}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // baza əlçatmazsa, yalnız statik səhifələr
  }

  return base;
}
