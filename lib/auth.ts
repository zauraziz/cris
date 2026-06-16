import crypto from "crypto";

// Rollar: rektor (hamısı), dekan (öz fakültəsi), kafedra müdiri (öz kafedrası)
export type Role = "rector" | "dean" | "head";

export type Session = {
  role: Role;
  faculty?: string;
  kafedra?: string;
  name?: string;
};

// HMAC açarı: AUTH_SECRET → ADMIN_PASSWORD → CRON_SECRET ardıcıllığı ilə
function secret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.CRON_SECRET ||
    "adda-portal-dev-secret"
  );
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

// İmzalanmış sessiya tokeni: base64url(payload).hmac
export function signSession(payload: Session): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifySession(token: string | undefined | null): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

// Konfiqurasiya əsaslı işçi hesabları (env STAFF_ACCOUNTS = JSON massiv)
// [{ "user":"dekan.gs", "pass":"...", "role":"dean", "faculty":"...", "name":"..." }, ...]
export type StaffAccount = {
  user: string;
  pass: string;
  role: Role;
  faculty?: string;
  kafedra?: string;
  name?: string;
};

export function staffAccounts(): StaffAccount[] {
  try {
    const arr = JSON.parse(process.env.STAFF_ACCOUNTS || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((a) => a && a.user && a.pass && a.role);
  } catch {
    return [];
  }
}

// Sessiyaya görə insan-oxunaqlı rol etiketi
// Parol hashing (scrypt + təsadüfi salt) — "salt:hash" formatında saxlanır
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const calc = crypto.scryptSync(password, salt, 32).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

// Sessiyaya görə insan-oxunaqlı rol etiketi
export function roleLabel(s: Session): string {
  if (s.role === "rector") return "Rektor / Administrator";
  if (s.role === "dean") return "Dekan";
  if (s.role === "head") return "Kafedra müdiri";
  return "İstifadəçi";
}

export function scopeLabel(s: Session): string {
  if (s.role === "rector") return "Bütün fakültələr";
  if (s.role === "dean") return s.faculty || "—";
  if (s.role === "head") return s.kafedra || "—";
  return "";
}
