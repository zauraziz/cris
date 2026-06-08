"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PendingItem = {
  id: number;
  full_name: string;
  orcid: string | null;
  works_count: number;
  citations: number;
  h_index: number;
};

export default function ModerationQueue({
  items,
  structure,
  positions,
}: {
  items: PendingItem[];
  structure: Record<string, string[]>;
  positions: string[];
}) {
  const [rows, setRows] = useState<PendingItem[]>(items);
  const [sel, setSel] = useState<Record<number, { faculty: string; kafedra: string; position: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();

  const faculties = Object.keys(structure);

  function setField(id: number, field: "faculty" | "kafedra" | "position", value: string) {
    setSel((s) => {
      const cur = s[id] || { faculty: "", kafedra: "", position: "" };
      const next = { ...cur, [field]: value };
      if (field === "faculty") next.kafedra = "";
      return { ...s, [id]: next };
    });
  }

  async function moderate(id: number, action: "approve" | "reject") {
    if (busy) return;
    const choice = sel[id] || { faculty: "", kafedra: "", position: "" };
    if (action === "approve" && (!choice.faculty || !choice.kafedra)) {
      alert("Təsdiq üçün fakültə və kafedra seçin.");
      return;
    }
    setBusy(id);
    try {
      const r = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          faculty: choice.faculty || undefined,
          kafedra: choice.kafedra || undefined,
          position_title: choice.position || undefined,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "xəta");
      setRows((rs) => rs.filter((x) => x.id !== id));
      router.refresh();
    } catch (e: any) {
      alert("Xəta: " + (e.message || "naməlum"));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return <div className="card"><div className="card-pad" style={{ textAlign: "center", color: "var(--faint)" }}>Təsdiq gözləyən tədqiqatçı yoxdur.</div></div>;
  }

  return (
    <div className="mod-list">
      {rows.map((r) => {
        const c = sel[r.id] || { faculty: "", kafedra: "", position: "" };
        return (
          <div className="mod-item" key={r.id}>
            <div className="mod-info">
              <div className="mod-name">{r.full_name}</div>
              <div className="mod-meta">
                {r.orcid && <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noreferrer">ORCID: {r.orcid}</a>}
                <span>{r.works_count} publikasiya</span>
                <span>{r.citations} sitat</span>
                <span>h-indeks {r.h_index}</span>
              </div>
            </div>
            <div className="mod-assign">
              <select className="sel" value={c.faculty} onChange={(e) => setField(r.id, "faculty", e.target.value)}>
                <option value="">Fakültə...</option>
                {faculties.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select className="sel" value={c.kafedra} onChange={(e) => setField(r.id, "kafedra", e.target.value)} disabled={!c.faculty}>
                <option value="">{c.faculty ? "Kafedra..." : "Əvvəlcə fakültə"}</option>
                {c.faculty && structure[c.faculty].map((k) => <option key={k}>{k}</option>)}
              </select>
              <select className="sel" value={c.position} onChange={(e) => setField(r.id, "position", e.target.value)}>
                <option value="">Vəzifə...</option>
                {positions.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="mod-actions">
              <button className="btn-approve" disabled={busy === r.id} onClick={() => moderate(r.id, "approve")}>
                {busy === r.id ? "..." : "Təsdiqlə"}
              </button>
              <button className="btn-reject" disabled={busy === r.id} onClick={() => moderate(r.id, "reject")}>Rədd et</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
