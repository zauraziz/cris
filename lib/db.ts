import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon serverless HTTP driver — Vercel-də (serverless) optimal işləyir.
// neon() boş bağlantı sətri ilə dərhal xəta atdığı üçün gec (lazy)
// inicializasiya edirik — xəta yalnız sorğu vaxtı (try/catch daxilində) baş verir.

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL təyin edilməyib.");
  }
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Cədvəlin mövcudluğunu təmin edir (idempotent).
// Beləliklə deploy-dan sonra schema.sql-i əl ilə işlətmək unudulsa belə,
// ilk yazıda/oxumada cədvəl avtomatik yaranır.
let _schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS researchers (
      id              SERIAL PRIMARY KEY,
      email           TEXT UNIQUE NOT NULL,
      full_name       TEXT NOT NULL,
      orcid           TEXT,
      orcid_name      TEXT,
      openalex_id     TEXT,
      works_count     INTEGER NOT NULL DEFAULT 0,
      citations       INTEGER NOT NULL DEFAULT 0,
      h_index         INTEGER NOT NULL DEFAULT 0,
      i10_index       INTEGER NOT NULL DEFAULT 0,
      scholar_id      TEXT,
      researchgate    TEXT,
      faculty         TEXT NOT NULL,
      kafedra         TEXT NOT NULL,
      position_title  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  // Mövcud cədvəl üçün miqrasiya (OpenAlex sütunları) — idempotent
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS openalex_id TEXT`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS citations INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS h_index INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS i10_index INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS wos_works INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS wos_citations INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS wos_h_index INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS wos_checked_at TIMESTAMPTZ`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS photo TEXT`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS research_interests TEXT`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS linkedin TEXT`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS website TEXT`;
  // Moderasiya / mənbə (institusional harvest üçün)
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved'`;
  await sql`ALTER TABLE researchers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'self'`;
  // Harvest edilən müəlliflərin emaili/kafedrası olmaya bilər
  await sql`ALTER TABLE researchers ALTER COLUMN email DROP NOT NULL`;
  await sql`ALTER TABLE researchers ALTER COLUMN faculty DROP NOT NULL`;
  await sql`ALTER TABLE researchers ALTER COLUMN kafedra DROP NOT NULL`;
  // Dinamik admin hesabları (kafedra müdirləri və s.)
  await sql`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id           SERIAL PRIMARY KEY,
      username     TEXT UNIQUE NOT NULL,
      pass_hash    TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'head',
      faculty      TEXT,
      kafedra      TEXT,
      name         TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  _schemaReady = true;
}
