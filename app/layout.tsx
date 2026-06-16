import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { getLocale } from "@/lib/i18n";

const SITE = "https://cris.adda.edu.az";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "ADDA Elm Portalı — Current Research Information System (CRIS)",
    template: "%s — ADDA Elm Portalı",
  },
  description:
    "Azərbaycan Dövlət Dəniz Akademiyası — Cari Tədqiqat İnformasiya Sistemi (Current Research Information System). Tədqiqatçı profilləri, beynəlxalq elmmetrik göstəricilər və açıq elmi məlumat.",
  applicationName: "ADDA Elm Portalı",
  keywords: [
    "ADDA", "Azərbaycan Dövlət Dəniz Akademiyası", "Azerbaijan State Marine Academy",
    "CRIS", "elm portalı", "tədqiqatçı", "ORCID", "OpenAlex", "elmmetrik", "research information system",
  ],
  authors: [{ name: "Azərbaycan Dövlət Dəniz Akademiyası" }],
  icons: { icon: "/adda-logo.png", apple: "/adda-logo.png" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ADDA Elm Portalı",
    title: "ADDA Elm Portalı — Current Research Information System (CRIS)",
    description: "Azərbaycan Dövlət Dəniz Akademiyasının tədqiqatçı profilləri və elmmetrik göstəriciləri.",
    url: SITE,
    images: [{ url: "/adda-logo.png", width: 700, height: 699, alt: "ADDA" }],
  },
  twitter: {
    card: "summary",
    title: "ADDA Elm Portalı — CRIS",
    description: "Azərbaycan Dövlət Dəniz Akademiyasının tədqiqat informasiya sistemi.",
    images: ["/adda-logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
