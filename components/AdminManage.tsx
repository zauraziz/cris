"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ManageRow = {
  id: number;
  full_name: string;
  orcid: string | null;
  email: string | null;
  faculty: string | null;
  kafedra: string | null;
  position_title: string | null;
  works_count: number;
  citations: number;
  source: string | null;
};

function normName(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildGroups(rows: ManageRow[]): ManageRow[][] {
  const groups: ManageRow[][] = [];
  const used = new Set<number>();

  // 1) ORCID üzrə
  const byOrcid = new Map<string, ManageRow[]>();
  for (const r of rows) {
    if (r.orcid && r.orcid.trim()) {
      const k = r.orcid.toUpperCase();
      if (!byOrcid.has(k)) byOrcid.set(k, []);
      byOrcid.get(k)!.push(r);
    }
  }
  byOrcid.forEach((g) => {
    if (g.length > 1) { groups.push(g); g.forEach((r) => used.add(r.id)); }
  });

  // 2) Ad üzrə (ORCID qrupunda olmayanlar)
  const byName = new Map<string, ManageRow[]>();
  for (const r of rows) {
    if (used.has(r.id)) continue;
    const k = normName(r.full_name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(r);
  }
  byName.forEach((g) => {
    if (g.length > 1) { groups.push(g); g.forEach((r) => used.add(r.id)); }
  });

  return groups;
}

export default function AdminManage({ rows }: { rows: ManageRow[] }) {
  const router = useRouter();
  const groups = useMemo(() => buildGroups(rows), [rows]);
  const [busy, setBusy] = useState<string>("");
  const [q, setQ] = useState("");

  async function merge(groupRows: ManageRow[], primaryId: number) {
    const mergeIds = groupRows.map((r) => r.id).filter((id) => id !== primaryId);
    if (mergeIds.length === 0) return;
    if (!confirm(`${mergeIds.length} profil seçilmiş əsas profillə birləşdiriləcək və silinəcək. Davam edilsin?`)) return;
    setBusy("m" + primaryId);
    try {
      const res = await fetch("/api/admin/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryId, mergeIds }) });
      const data = await res.json();
      if (data.ok) router.refresh();
      else alert("Xəta: " + (data.message || data.error));
    } catch { alert("Şəbəkə xətası."); }
    setBusy("");
  }

  async function del(id: number, name: string) {
    if (!confirm(`«${name}» profili həmişəlik silinsin? Bu əməliyyat geri qaytarıla bilməz.`)) return;
    setBusy("d" + id);
    try {
      const res = await fetch("/api/admin/researcher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
      const data = await res.json();
      if (data.ok) router.refresh();
      else alert("Xəta: " + (data.message || data.error));
    } catch { alert("Şəbəkə xətası."); }
    setBusy("");
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return rows.filter((r) => [r.full_name, r.email, r.orcid, r.kafedra].filter(Boolean).some((f) => String(f).toLowerCase().includes(t))).slice(0, 12);
  }, [rows, q]);

  return (
    <div className="mng">
      {/* Dublikatlar */}
      <div className="mng-card">
        <div className="mng-h">Təkrarlanan profillər <span className="mng-count">{groups.length}</span></div>
        <p className="mng-sub">Eyni ORCID və ya eyni ada malik profillər. Saxlanılacaq əsas profili seçin və birləşdirin — qalan profillərin məlumatları əsas profilə köçürülüb silinəcək.</p>
        {groups.length === 0 ? (
          <div className="mng-empty">Təkrarlanan profil tapılmadı.</div>
        ) : (
          <GroupList groups={groups} busy={busy} onMerge={merge} />
        )}
      </div>

      {/* Silmə */}
      <div className="mng-card">
        <div className="mng-h">Tədqiqatçının silinməsi</div>
        <p className="mng-sub">Axtarıb tapın və reyestrdən silin. Diqqət: silinmə geri qaytarıla bilməz.</p>
        <input className="mng-search" placeholder="Ad, e-poçt və ya ORCID üzrə axtar..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && (
          <div className="mng-results">
            {filtered.length === 0 ? <div className="mng-empty">Nəticə yoxdur.</div> : filtered.map((r) => (
              <div className="mng-row" key={r.id}>
                <div className="mng-info">
                  <b>{r.full_name}</b>
                  <span>{[r.position_title, r.kafedra, r.email].filter(Boolean).join(" · ")}</span>
                </div>
                <button className="mng-del" disabled={busy === "d" + r.id} onClick={() => del(r.id, r.full_name)}>
                  {busy === "d" + r.id ? "..." : "Sil"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupList({ groups, busy, onMerge }: { groups: ManageRow[][]; busy: string; onMerge: (g: ManageRow[], primaryId: number) => void }) {
  return (
    <div className="grp-list">
      {groups.map((g, gi) => <Group key={gi} rows={g} busy={busy} onMerge={onMerge} />)}
    </div>
  );
}

function Group({ rows, busy, onMerge }: { rows: ManageRow[]; busy: string; onMerge: (g: ManageRow[], primaryId: number) => void }) {
  // Default əsas: ən çox publikasiyası / e-poçtu olan
  const def = [...rows].sort((a, b) => (b.email ? 1 : 0) - (a.email ? 1 : 0) || b.works_count - a.works_count)[0];
  const [primary, setPrimary] = useState<number>(def.id);
  return (
    <div className="grp">
      <div className="grp-key">{rows[0].orcid ? <>ORCID: <code>{rows[0].orcid}</code></> : <>Ad: <b>{rows[0].full_name}</b></>}</div>
      <div className="grp-rows">
        {rows.map((r) => (
          <label className={"grp-row" + (primary === r.id ? " sel" : "")} key={r.id}>
            <input type="radio" checked={primary === r.id} onChange={() => setPrimary(r.id)} />
            <div className="grp-info">
              <b>{r.full_name}</b>
              <span>{[r.email || "e-poçtsuz", r.kafedra, `${r.works_count} nəşr`, `${r.citations} sitat`, r.source].filter(Boolean).join(" · ")}</span>
            </div>
            {primary === r.id && <span className="grp-tag">əsas</span>}
          </label>
        ))}
      </div>
      <button className="grp-merge" disabled={busy === "m" + primary} onClick={() => onMerge(rows, primary)}>
        {busy === "m" + primary ? "Birləşdirilir..." : "Seçilmişləri birləşdir"}
      </button>
    </div>
  );
}
