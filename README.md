# ADDA Elm Portalı — Elmmetrik Profil Sistemi

**TURMARIN M1 Pilotu** — ADDA professor-müəllim heyətinin elmmetrik profillərini beynəlxalq bazalarla (ORCID, OpenAlex, Crossref) birləşdirən sistem.

Bu, prototipin **istehsal versiyasıdır**: `localStorage` əvəzinə real verilənlər bazası (Neon Postgres), server API-ları və ORCID-in server tərəfdə yoxlanması.

---

## Texnologiya

- **Next.js 14** (App Router) + TypeScript
- **Neon** — serverless Postgres (Vercel ilə tam uyğun)
- **Tailwind CSS** + xüsusi dizayn sistemi
- **ORCID Public API** — server tərəfdə yoxlama (lisenziya tələb etmir)
- Deploy: **Vercel**

---

## Sürətli başlanğıc (lokal)

```bash
# 1. Asılılıqları quraşdırın
npm install

# 2. Mühit dəyişənlərini hazırlayın
cp .env.example .env
#   .env faylını açın və DATABASE_URL dəyərini Neon-dan əlavə edin

# 3. Verilənlər bazası cədvəllərini yaradın
npm run db:init

# 4. İşə salın
npm run dev
#   http://localhost:3000
```

---

## Neon verilənlər bazasının qurulması

İki yol var.

### Yol A — Vercel Marketplace inteqrasiyası (tövsiyə olunur)

1. Layihəni Vercel-ə deploy edin (aşağıya baxın).
2. Vercel layihə panelində **Storage → Create Database → Neon** seçin.
3. Vercel avtomatik olaraq `DATABASE_URL` (və əlaqəli) mühit dəyişənlərini layihəyə əlavə edir.
4. Cədvəlləri yaratmaq üçün:
   - **Neon panelinin SQL Editor**-ında `db/schema.sql` faylının məzmununu yapışdırıb icra edin; **və ya**
   - lokalda `DATABASE_URL` təyin edib `npm run db:init` işlədin.

### Yol B — Neon-da əl ilə

1. [neon.tech](https://neon.tech) saytında pulsuz layihə yaradın.
2. **Connection string**-i kopyalayın (`postgresql://...pooler...neon.tech/...?sslmode=require`).
3. Onu Vercel-də `DATABASE_URL` mühit dəyişəni kimi əlavə edin (Settings → Environment Variables).
4. `db/schema.sql`-i Neon SQL Editor-da icra edin və ya `npm run db:init` işlədin.

---

## Vercel-ə deploy

```bash
# Layihəni GitHub repozitoriyasına yükləyin, sonra:
# 1. vercel.com → Add New → Project → repo seçin
# 2. Framework: Next.js (avtomatik aşkarlanır)
# 3. Environment Variables:
#       DATABASE_URL              = (Neon bağlantı sətri)
#       NEXT_PUBLIC_EMAIL_DOMAIN  = adda.edu.az
# 4. Deploy
```

Alternativ — Vercel CLI:

```bash
npm i -g vercel
vercel            # ilk deploy (preview)
vercel --prod     # production
```

---

## Mühit dəyişənləri

| Dəyişən | Təsvir | Nümunə |
|---|---|---|
| `DATABASE_URL` | Neon Postgres bağlantı sətri | `postgresql://user:pass@ep-...pooler.../db?sslmode=require` |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | İcazəli korporativ e-poçt domen(lər)i | `adda.edu.az` (vergüllə bir neçə: `adda.edu.az,asco.az`) |

---

## Strukturu öz akademiyanıza uyğunlaşdırın

Fakültə və kafedra adları **nümunədir**. Real strukturla əvəz etmək üçün yalnız bir fayl dəyişdirilir:

```
lib/adda.ts  →  ADDA_STRUCTURE obyekti
```

Vəzifə siyahısı (`POSITIONS`) və e-poçt domeni (`EMAIL_DOMAINS`) də həmin fayldadır.

---

## Layihə strukturu

```
adda-portal/
├── app/
│   ├── page.tsx                  # Ana səhifə (Wizard)
│   ├── layout.tsx                # Şriftlər, metadata
│   ├── globals.css               # Dizayn sistemi
│   ├── dashboard/page.tsx        # Analitika (server komponent, Neon-dan oxuyur)
│   └── api/
│       ├── verify-orcid/route.ts # ORCID yoxlama (server proxy)
│       └── profile/route.ts      # Profil saxlama (upsert → Neon)
├── components/
│   ├── Wizard.tsx                # Giriş → ID → təsdiq axını (client)
│   └── FacultyAccordion.tsx      # Dashboard akkordeonu (client)
├── lib/
│   ├── db.ts                     # Neon bağlantısı
│   └── adda.ts                   # ADDA strukturu + sabitlər
├── db/schema.sql                 # Verilənlər bazası sxemi
└── scripts/init-db.mjs           # Cədvəl yaratma skripti
```

---

## İş axını

1. Əməkdaş korporativ e-poçtu (`@adda.edu.az`) ilə daxil olur.
2. ORCID / Scholar / ResearchGate ID-lərini daxil edir.
3. **ORCID** real vaxtda beynəlxalq bazadan yoxlanılır (ad + əsər sayı).
4. Fakültə, kafedra və vəzifəni seçir.
5. Təsdiq → məlumat Neon bazasına yazılır (`/api/profile`).
6. **Dashboard** fakültə/kafedra üzrə toplu göstəriciləri göstərir.

---

## Növbəti addımlar (M1 planına uyğun)

- ✅ **OpenAlex inteqrasiyası** (TAMAMLANDI): publikasiya, sitat və h-indeks avtomatik alınır.
- ✅ **İstifadəçi/admin ayrımı** (TAMAMLANDI): `/` istifadəçi profili, `/admin` parolla qorunan tam dashboard.
- ✅ **Avtomatik yeniləmə** (TAMAMLANDI): Vercel Cron hər gün göstəriciləri yeniləyir + admin paneldən əl ilə yeniləmə.
- **Pillələnmiş rollar**: rektor / dekan (öz fakültəsi) / kafedra müdiri (öz kafedrası) üçün ayrı görünüşlər.
- **Tədqiqatçı detal səhifəsi**: hər alimin publikasiya siyahısı, illik trend.
- **Autentifikasiya**: magic-link və ya korporativ SSO (hazırda user email-əsaslı, admin parol-əsaslı).

## Avtomatik yeniləmə (Vercel Cron)

`vercel.json`-dakı cron hər gün saat 03:00 UTC-də `/api/cron/refresh` endpoint-ini çağırır. Endpoint hər tədqiqatçının OpenAlex göstəricilərini yenidən çəkir (ən köhnələr əvvəl, dayanıqlı/resumable).

**Quraşdırma:**
1. Vercel-də `CRON_SECRET` mühit dəyişənini təyin edin (təsadüfi uzun sətir — məs. `openssl rand -hex 32`). Vercel cron çağırışını `Authorization: Bearer <CRON_SECRET>` ilə göndərəcək.
2. Deploy edin — Vercel cron-u avtomatik qeydiyyata alır (Hobby planı: gündə 1 dəfə).
3. Əl ilə yeniləmə: `/admin` → "Göstəriciləri indi yenilə" düyməsi (admin sessiyası ilə işləyir).

Qeyd: Hobby planında cron gündə bir dəfə işləyir və funksiya maksimum 60 saniyə davam edə bilər. Endpoint hər sətri ayrıca yazdığı üçün vaxt limitinə çatılsa belə, görülən iş itmir.

## Elmmetrik mənbələr

| Göstərici | Mənbə | Qeyd |
|---|---|---|
| Kimlik (ad) | ORCID | `pub.orcid.org` |
| Publikasiya sayı | OpenAlex | `works_count` |
| Sitat sayı | OpenAlex | `cited_by_count` |
| h-indeks, i10-indeks | OpenAlex | `summary_stats` (hazır gəlir) |

Hamısı **pulsuz və açıq** API-lardır — lisenziya tələb etmir.

---

© ADDA · TURMARIN M1 Pilotu · Bakı 2026
