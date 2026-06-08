"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HarvestButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/harvest", { method: "POST" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "xəta");
      if (d.imported > 0) {
        setMsg(`${d.imported} yeni müəllif import edildi (təsdiq gözləyir).`);
        router.refresh();
      } else {
        setMsg(d.message || "Yeni müəllif tapılmadı.");
      }
    } catch (e: any) {
      setMsg("Xəta: " + (e.message || "naməlum"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button className="btn btn-teal" onClick={run} disabled={busy} style={{ width: "auto", padding: "10px 18px" }}>
        {busy ? (
          <><span className="rap-spin" style={{ marginRight: 8 }} /> Import olunur...</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 7 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            OpenAlex-dən müəllifləri import et
          </>
        )}
      </button>
      {msg && <span style={{ fontSize: 13, color: "var(--muted)" }}>{msg}</span>}
    </div>
  );
}
