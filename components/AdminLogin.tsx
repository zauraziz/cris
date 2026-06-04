"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "Parol yanlışdır.");
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Xəta baş verdi.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="card-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div className="brand-mark" style={{ width: 44, height: 44 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18 }}>İdarəetmə paneli</h3>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Admin girişi tələb olunur</div>
            </div>
          </div>
          <div className="field">
            <label>Admin parolu</label>
            <input
              className={"inp" + (err ? " err" : "")}
              type="password"
              value={pw}
              placeholder="••••••••"
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
            />
            {err && <div className="err-msg">{err}</div>}
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? "Yoxlanılır..." : "Daxil ol"}
          </button>
          <p className="lf-note">Bu panel ADDA-nın bütün elmmetrik məlumatlarını əhatə edir.</p>
        </div>
      </div>
    </div>
  );
}
