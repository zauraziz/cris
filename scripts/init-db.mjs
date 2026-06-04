// Verilənlər bazası cədvəllərini yaradan skript.
// İstifadə:  DATABASE_URL təyin edilib, sonra `npm run db:init`
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL təyin edilməyib. .env faylına əlavə edin.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");

// Şərhləri çıxarıb, ifadələri ";" ilə ayırırıq
const statements = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const sql = neon(url);

try {
  for (const stmt of statements) {
    await sql.query(stmt);
    console.log("✓ " + stmt.split("\n")[0].slice(0, 60) + "…");
  }
  console.log("\n✓ Cədvəllər uğurla yaradıldı.");
} catch (err) {
  console.error("✗ Xəta:", err.message);
  process.exit(1);
}
