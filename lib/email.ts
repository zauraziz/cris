// Microsoft 365 (Graph API) ilə email göndərmə — client credentials axını.
// Mövcud Azure AD app qeydiyyatından istifadə edir; əlavə olaraq:
//   • application permission: Mail.Send (admin consent verilməli)
//   • GRAPH_SENDER = göndərən poçt qutusu (məs. noreply@adda.edu.az)

const TENANT = process.env.AZURE_AD_TENANT_ID;
const CLIENT = process.env.AZURE_AD_CLIENT_ID;
const SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const SENDER = process.env.GRAPH_SENDER;

export function emailConfigured(): boolean {
  return !!(TENANT && CLIENT && SECRET && SENDER);
}

export function emailSender(): string | null {
  return SENDER || null;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!emailConfigured()) return null;
  if (cachedToken && Date.now() < cachedToken.exp - 60_000) return cachedToken.token;
  try {
    const body = new URLSearchParams({
      client_id: CLIENT!,
      client_secret: SECRET!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.access_token) return null;
    cachedToken = { token: d.access_token, exp: Date.now() + (Number(d.expires_in || 3600) * 1000) };
    return d.access_token;
  } catch {
    return null;
  }
}

export type SendResult = { ok: boolean; error?: string };

export async function sendMail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "not_configured" };
  const target = (to || "").trim();
  if (!target || !target.includes("@")) return { ok: false, error: "bad_recipient" };
  const token = await getToken();
  if (!token) return { ok: false, error: "auth_failed" };
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER!)}/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: target } }],
        },
        saveToSentItems: false,
      }),
    });
    if (res.status === 202) return { ok: true };
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `graph_${res.status}: ${txt.slice(0, 180)}` };
  } catch (e: any) {
    return { ok: false, error: "network: " + (e?.message || "") };
  }
}
