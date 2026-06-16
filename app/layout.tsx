import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// ⚠️ FONT: Əgər CRIS-də fərqli font istifadə edirsənsə (məs. Plus Jakarta Sans,
// Sora və ya lokal font), bu sətri öz mövcud konfiqurasiyanla əvəz et.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://cris.adda.edu.az'),
  title: {
    default: 'CRIS — ADDA Tədqiqat İnformasiya Sistemi',
    template: '%s | CRIS · ADDA',
  },
  description:
    'Azərbaycan Dövlət Dəniz Akademiyasının (ADDA) Tədqiqat İnformasiya Sistemi (CRIS) — tədqiqatçı profilləri, elmi nəşrlər, OpenAlex və ORCID inteqrasiyası ilə institusional elmi fəaliyyətin vahid platforması.',
  applicationName: 'CRIS ADDA',
  authors: [{ name: 'Azərbaycan Dövlət Dəniz Akademiyası' }],
  generator: 'Next.js',
  keywords: [
    'CRIS',
    'ADDA',
    'tədqiqat',
    'elmi nəşrlər',
    'OpenAlex',
    'ORCID',
    'Azərbaycan Dövlət Dəniz Akademiyası',
    'TURMARIN',
  ],

  // 🔻 Bing Webmaster Tools doğrulaması (msvalidate.01)
  // Render olunmuş HTML: <meta name="msvalidate.01" content="08766882CE682E46BC59C50AF37EB096"/>
  verification: {
    // google: 'BURAYA-GOOGLE-KODUN', // əgər varsa açıb əlavə et
    other: {
      'msvalidate.01': '08766882CE682E46BC59C50AF37EB096',
    },
  },

  openGraph: {
    type: 'website',
    locale: 'az_AZ',
    url: 'https://cris.adda.edu.az',
    siteName: 'CRIS · ADDA',
    title: 'CRIS — ADDA Tədqiqat İnformasiya Sistemi',
    description:
      'Tədqiqatçı profilləri, elmi nəşrlər və institusional analitika — ADDA üçün vahid tədqiqat platforması.',
  },

  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az">
      <body className={inter.className}>
        {/* 🔑 KRİTİK: SessionProvider buradan gəlir — bunsuz useSession() undefined qaytarır
            və /login build zamanı çökür. {children} mütləq <Providers> içində olmalıdır. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
