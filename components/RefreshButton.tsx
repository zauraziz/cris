"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/cron/refresh", { method: "POST" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || d.error || "xəta");
      const parts = [`${d.updated} profil yeniləndi`];
      if (d.notFound) parts.push(`${d.notFound} OpenAlex-də tapılmadı`);
      if (d.errors) parts.push(`${d.errors} xəta`);
      setMsg(parts.join(" · "));
      router.refresh();
    } catch (e: any) {
      setMsg("Xəta: " + (e.message || "naməlum"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button className="btn-verify" onClick={run} disabled={busy} style={{ padding: "9px 16px", display: "inline-flex", alignItems: "center", gap: 7 }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className={busy ? "spin" : ""}><path d="M21 2v6h-6M3 22v-6h6"/><path d="M21 8A9 9 0 006.3 5.3L3 8M3 16a9 9 0 0014.7 2.7L21 16"/></svg>
        {busy ? "Yenilənir..." : "Göstəriciləri indi yenilə"}
      </button>
      {msg && <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{msg}</span>}
    </div>
  );
}
