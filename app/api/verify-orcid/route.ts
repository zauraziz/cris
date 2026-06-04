import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// GET /api/verify-orcid?id=0000-0000-0000-0000
// ORCID-i beynəlxalq açıq bazadan (pub.orcid.org) yoxlayır.
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").toUpperCase().trim();

  if (!ORCID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "format", message: "ORCID formatı yanlışdır." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${id}/record`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "notfound", message: "ORCID tapılmadı." },
        { status: 404 }
      );
    }

    const data = await res.json();
    const given = data?.person?.name?.["given-names"]?.value || "";
    const family = data?.person?.name?.["family-name"]?.value || "";
    const name = (given + " " + family).trim() || "Ad göstərilməyib";

    let works = 0;
    try {
      works = (data?.["activities-summary"]?.works?.group || []).length;
    } catch {
      works = 0;
    }

    return NextResponse.json({ ok: true, id, name, works });
  } catch {
    return NextResponse.json(
      { ok: false, error: "network", message: "Bağlantı xətası." },
      { status: 502 }
    );
  }
}
