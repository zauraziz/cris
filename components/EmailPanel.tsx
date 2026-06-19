"use client";

import { useEffect, useState, type CSSProperties } from "react";

type RunResult = {
  ok: boolean; configured: boolean; scanned: number; eligible: number;
  sent: { welcome: number; newWorks: number; orcid: number; area: number };
  baseline: number; skipped: number; errors: number; elapsedMs: number;
};

export default function EmailPanel() {
  const [cfg, setCfg] = useState<{ configured: boolean; sender: string | null } | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/email");
        const d = await r.json();
        if (d.ok) setCfg({ configured: d.configured, sender: d.sender });
      } catch { /* ignore */ }
    })();
  }, []);

  async function sendTest() {
    if (!to.includes("@")) { setMsg({ ok: false, text: "Düzgün e-poçt daxil edin." }); return; }
    setBusy("test"); setMsg(null);
    try {
      const r = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", to }) });
      const d = await r.json();
      setMsg(d.ok ? { ok: true, text: `Test göndərildi → ${to}` } : { ok: false, text: "Xəta: " + (d.message || d.error) });
    } catch { setMsg({ ok: false, text: "Şəbəkə xətası." }); }
    setBusy("");
  }

  async function runNow() {
    if (!confirm("Bildirişlər indi işə salınsın? Uyğun tədqiqatçılara email göndəriləcək (limit daxilində).")) return;
    setBusy("run"); setMsg(null); setRun(null);
    try {
      const r = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run" }) });
      const d = await r.json();
      if (d.configured === false) setMsg({ ok: false, text: "Email konfiqurasiya olunmayıb (AZURE_AD_* + GRAPH_SENDER)." });
      else setRun(d);
    } catch { setMsg({ ok: false, text: "Şəbəkə xətası." }); }
    setBusy("");
  }

  const inp: CSSProperties = { flex: 1, minWidth: 180, padding: "9px 10px", border: "1px solid #d0d7de", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#0A2540" };
  const btn: CSSProperties = { padding: "9px 16px", border: "none", background: "#0FA3B1", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 };

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 12, color: cfg?.configured ? "#0a7f3f" : "#92600a", background: cfg?.configured ? "#e3f6ea" : "#fdf1d6", padding: "8px 12px", borderRadius: 8 }}>
        {cfg == null ? "Status yoxlanılır..." : cfg.configured
          ? `✓ Microsoft 365 (Graph) konfiqurasiya olunub. Göndərən: ${cfg.sender}`
          : "⚠ Email konfiqurasiya olunmayıb. Vercel-də AZURE_AD_CLIENT_ID/SECRET/TENANT_ID + GRAPH_SENDER təyin edin və Azure app-a Mail.Send (application) icazəsi verin."}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input style={inp} placeholder="test üçün e-poçt ünvanı" value={to} onChange={(e) => setTo(e.target.value)} />
        <button style={{ ...btn, opacity: busy === "test" ? 0.6 : 1 }} disabled={busy === "test"} onClick={sendTest}>
          {busy === "test" ? "Göndərilir..." : "Test göndər"}
        </button>
        <button style={{ ...btn, background: "#0A2540", opacity: busy === "run" ? 0.6 : 1 }} disabled={busy === "run"} onClick={runNow}>
          {busy === "run" ? "İşləyir..." : "Bildirişləri indi işə sal"}
        </button>
      </div>

      {msg && <div style={{ fontSize: 13, color: msg.ok ? "#0a7f3f" : "#c0392b", marginBottom: 8 }}>{msg.text}</div>}

      {run && (
        <div style={{ fontSize: 13, color: "#33424f", background: "#f6f8fa", padding: "10px 12px", borderRadius: 8, lineHeight: 1.7 }}>
          Tarama: <b>{run.scanned}</b> · uyğun: <b>{run.eligible}</b> · baza qeydi: <b>{run.baseline}</b><br />
          Göndərildi — gücləndirmə: <b>{run.sent.welcome}</b>, yeni nəşr: <b>{run.sent.newWorks}</b>, ORCID: <b>{run.sent.orcid}</b>, sahə: <b>{run.sent.area}</b><br />
          Korporativ olmayan (ötürüldü): <b>{run.skipped}</b> · xətalar: <b>{run.errors}</b> · {run.elapsedMs} ms
        </div>
      )}

      <p style={{ fontSize: 12, color: "#8a97a4", marginTop: 10, lineHeight: 1.6 }}>
        Avtomatik bildirişlər yalnız korporativ e-poçtu olan (adda.edu.az / asco.az) və imtina etməmiş tədqiqatçılara gedir.
        Hər bildiriş bir dəfə göndərilir (email_log ilə təkrar qarşısı alınır). Gündəlik cron avtomatik işə salır.
      </p>
    </div>
  );
}
