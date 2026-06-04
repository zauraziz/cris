import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon serverless HTTP driver — Vercel-də (serverless) optimal işləyir.
// neon() boş bağlantı sətri ilə dərhal xəta atdığı üçün gec (lazy)
// inicializasiya edirik — beləliklə xəta yalnız sorğu vaxtı (try/catch
// daxilində) baş verir, import vaxtı deyil.

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
