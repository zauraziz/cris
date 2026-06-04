-- ADDA Elmmetrik Profil Sistemi — verilənlər bazası sxemi (Neon Postgres)
-- Bu faylı Neon panelinin "SQL Editor" hissəsində icra edin,
-- və ya layihə kökündə `npm run db:init` əmrini işlədin.

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
);

CREATE INDEX IF NOT EXISTS idx_researchers_faculty ON researchers (faculty);
CREATE INDEX IF NOT EXISTS idx_researchers_kafedra ON researchers (kafedra);

-- Mövcud cədvəl üçün miqrasiya (OpenAlex sütunları). Təkrar işlədilə bilər.
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS openalex_id TEXT;
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS citations  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS h_index    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS i10_index  INTEGER NOT NULL DEFAULT 0;
