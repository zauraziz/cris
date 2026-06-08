import { NextRequest, NextResponse } from "next/server";
import { getSql, ensureSchema } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { fetchInstitutionByRor, fetchInstitutionAuthors } from "@/lib/openalex";
import { ADDA_ROR } from "@/lib/adda";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isRector(req: NextRequest): boolean {
  const session = verifySession(req.cookies.get("adda_session")?.value);
  return !!(session && session.role === "rector");
}

// POST /api/admin/harvest — OpenAlex-dən ADDA müəlliflərini "təsdiq gözləyir" statusu ilə gətirir
export async function POST(req: NextRequest) {
  if (!isRector(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    await ensureSchema();
    const sql = getSql();

    const inst = await fetchInstitutionByRor(ADDA_ROR);
    if (!inst.found || !inst.openalexId) {
      return NextResponse.json({ ok: false, message: "OpenAlex institut profili tapılmadı." }, { status: 200 });
    }

    const authors = await fetchInstitutionAuthors(inst.openalexId, 300);
    if (!authors.length) {
      return NextResponse.json({ ok: true, imported: 0, found: 0, message: "Müəllif tapılmadı." });
    }

    // Mövcud olanları çıxarmaq (openalex_id və ya orcid üzrə)
    const existing = (await sql`SELECT openalex_id, orcid FROM researchers`) as { openalex_id: string | null; orcid: string | null }[];
    const haveOa = new Set(existing.map((e) => e.openalex_id).filter(Boolean) as string[]);
    const haveOrcid = new Set(existing.map((e) => (e.orcid ? e.orcid.toUpperCase() : "")).filter(Boolean));

    const fresh = authors.filter(
      (a) => !haveOa.has(a.openalexId) && !(a.orcid && haveOrcid.has(a.orcid.toUpperCase()))
    );

    if (!fresh.length) {
      return NextResponse.json({ ok: true, imported: 0, found: authors.length, message: "Hamısı artıq bazadadır." });
    }

    // Toplu insert (unnest ilə tək sorğu)
    const names = fresh.map((a) => a.name);
    const orcids = fresh.map((a) => a.orcid);
    const oaIds = fresh.map((a) => a.openalexId);
    const works = fresh.map((a) => a.worksCount);
    const cits = fresh.map((a) => a.citations);
    const hs = fresh.map((a) => a.hIndex);
    const i10s = fresh.map((a) => a.i10Index);

    await sql`
      INSERT INTO researchers
        (full_name, orcid, openalex_id, works_count, citations, h_index, i10_index, source, status, updated_at)
      SELECT full_name, orcid, openalex_id, works_count, citations, h_index, i10_index, 'openalex', 'pending', now()
      FROM unnest(
        ${names}::text[], ${orcids}::text[], ${oaIds}::text[],
        ${works}::int[], ${cits}::int[], ${hs}::int[], ${i10s}::int[]
      ) AS t(full_name, orcid, openalex_id, works_count, citations, h_index, i10_index)
    `;

    return NextResponse.json({ ok: true, imported: fresh.length, found: authors.length });
  } catch (err: any) {
    console.error("[/api/admin/harvest] xəta:", err?.message, err);
    return NextResponse.json({ ok: false, error: "harvest", message: err?.message || "Xəta" }, { status: 500 });
  }
}
