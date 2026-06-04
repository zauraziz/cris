import { NextRequest, NextResponse } from "next/server";
import { fetchOpenAlexByOrcid } from "@/lib/openalex";

export const dynamic = "force-dynamic";

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// GET /api/verify-orcid?id=0000-0000-0000-0000
// 1) ORCID-i pub.orcid.org-dan yoxlayır (kimlik təsdiqi)
// 2) OpenAlex-dən elmmetrik göstəriciləri çəkir (publikasiya, sitat, h-indeks)
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") || "").toUpperCase().trim();

  if (!ORCID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "format", message: "ORCID formatı yanlışdır." },
      { status: 400 }
    );
  }

  try {
    // İki mənbəni paralel çəkirik (sürət üçün)
    const orcidPromise = fetch(`https://pub.orcid.org/v3.0/${id}/record`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const openalexPromise = fetchOpenAlexByOrcid(id);

    const orcidRes = await orcidPromise;
    if (!orcidRes.ok) {
      return NextResponse.json(
        { ok: false, error: "notfound", message: "ORCID tapılmadı." },
        { status: 404 }
      );
    }

    const data = await orcidRes.json();
    const given = data?.person?.name?.["given-names"]?.value || "";
    const family = data?.person?.name?.["family-name"]?.value || "";
    const name = (given + " " + family).trim() || "Ad göstərilməyib";

    let orcidWorks = 0;
    try {
      orcidWorks = (data?.["activities-summary"]?.works?.group || []).length;
    } catch {
      orcidWorks = 0;
    }

    const openalex = await openalexPromise;

    return NextResponse.json({
      ok: true,
      id,
      name,
      works: orcidWorks,
      openalex,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "network", message: "Bağlantı xətası." },
      { status: 502 }
    );
  }
}
