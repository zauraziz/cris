"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
  status: string | null;
};

type Structure = Record<string, string[]>;

function normName(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function uniq(arr: (string | null | undefined)[]): string[] {
  return Array.from(new Set(arr.filter((x): x is string => !!x && x.trim() !== "")));
}
function statusText(s: string | null) {
  return s === "pending" ? "gözləmədə" : "təsdiqli";
}

function buildGroups(rows: ManageRow[]): ManageRow[][] {
  const groups: ManageRow[][] = [];
  const used = new Set<number>();

  const byOrcid = new Map<string, ManageRow[]>();
  for (const r of rows) {
    if (r.orcid && r.orcid.trim()) {
      const k = r.orcid.toUpperCase();
      if (!byOrcid.has(k)) byOrcid.set(k, []);
      byOrcid.get(k)!.push(r);
    }
  }
  byOrcid.forEach((g) => { if (g.length > 1) { groups.push(g); g.forEach((r) => used.add(r.id)); } });

  const byName = new Map<string, ManageRow[]>();
  for (const r of rows) {
    if (used.has(r.id)) continue;
    const k = normName(r.full_name);
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(r);
  }
  byName.forEach((g) => { if (g.length > 1) { groups.push(g); g.forEach((r) => used.add(r.id)); } });

  return groups;
}

export default function AdminManage({ rows, structure, positions }: { rows: ManageRow[]; structure: Structure; positions: string[] }) {
  const router = useRouter();
  const groups = useMemo(() => buildGroups(rows), [rows]);
  const [busy, setBusy] = useState<string>("");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  // Əl ilə birləşdirmə
  const [mq, setMq] = useState("");
  const [mSel, setMSel] = useState<number[]>([]);
  const [mPrimary, setMPrimary] = useState<number | null>(null);

  async function merge(groupRows: ManageRow[], primaryId: number) {
    const mergeIds = groupRows.map((r) => r.id).filter((id) => id !== primaryId);
    if (mergeIds.length === 0) return;
    if (!confirm(`${mergeIds.length} profil seçilmiş əsas profillə birləşdiriləcək və silinəcək. Davam edilsin?`)) return;
    setBusy("m" + primaryId);
    try {
      const res = await fetch("/api/admin/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primaryId, mergeIds }) });
      const data = await res.json();
      if (data.ok) { setMSel([]); setMPrimary(null); router.refresh(); }
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

  const mFiltered = useMemo(() => {
    const t = mq.trim().toLowerCase();
    if (!t) return [];
    return rows.filter((r) => [r.full_name, r.email, r.orcid, r.kafedra].filter(Boolean).some((f) => String(f).toLowerCase().includes(t))).slice(0, 20);
  }, [rows, mq]);

  const mSelRows = useMemo(() => rows.filter((r) => mSel.includes(r.id)), [rows, mSel]);

  function toggleSel(id: number) {
    setMSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setMPrimary((p) => (p == null ? id : p));
  }

  return (
    <div className="mng">
      {/* 1) Avtomatik aşkarlanan dublikatlar */}
      <div className="mng-card">
        <div className="mng-h">Təkrarlanan profillər (avtomatik) <span className="mng-count">{groups.length}</span></div>
        <p className="mng-sub">Eyni ORCID və ya eyni ada malik profillər (təsdiqli + gözləmədə). Saxlanılacaq əsas profili seçin və birləşdirin.</p>
        {groups.length === 0 ? (
          <div className="mng-empty">Təkrarlanan profil tapılmadı.</div>
        ) : (
          <div className="grp-list">
            {groups.map((g, gi) => <Group key={gi} rows={g} busy={busy} onMerge={merge} />)}
          </div>
        )}
      </div>

      {/* 2) Əl ilə birləşdirmə */}
      <div className="mng-card">
        <div className="mng-h">Əl ilə birləşdirmə</div>
        <p className="mng-sub">Avtomatik tapılmayan halda: istənilən profilləri (təsdiqli və ya gözləmədə) axtarıb seçin, əsas profili işarələyin və birləşdirin.</p>
        <input className="mng-search" placeholder="Ad, e-poçt və ya ORCID üzrə axtar..." value={mq} onChange={(e) => setMq(e.target.value)} />
        {mq.trim() && (
          <div className="mng-results">
            {mFiltered.length === 0 ? <div className="mng-empty">Nəticə yoxdur.</div> : mFiltered.map((r) => (
              <label className="mng-row" key={r.id} style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={mSel.includes(r.id)} onChange={() => toggleSel(r.id)} style={{ marginRight: 10 }} />
                <div className="mng-info">
                  <b>{r.full_name} <StatusBadge status={r.status} /></b>
                  <span>{[r.position_title, r.kafedra, r.email || "e-poçtsuz", r.orcid].filter(Boolean).join(" · ")}</span>
                </div>
              </label>
            ))}
          </div>
        )}
        {mSelRows.length >= 1 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #e6e9ee", paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#0A2540" }}>Seçilmiş {mSelRows.length} profil — əsas profili seçin:</div>
            <div className="grp-rows">
              {mSelRows.map((r) => (
                <label className={"grp-row" + (mPrimary === r.id ? " sel" : "")} key={r.id}>
                  <input type="radio" name="mprimary" checked={mPrimary === r.id} onChange={() => setMPrimary(r.id)} />
                  <div className="grp-info">
                    <b>{r.full_name} <StatusBadge status={r.status} /></b>
                    <span>{[r.email || "e-poçtsuz", r.kafedra, `${r.works_count} nəşr`, `${r.citations} sitat`, r.source].filter(Boolean).join(" · ")}</span>
                  </div>
                  {mPrimary === r.id && <span className="grp-tag">əsas</span>}
                </label>
              ))}
            </div>
            <button
              className="grp-merge"
              disabled={mSelRows.length < 2 || mPrimary == null || busy === "m" + mPrimary}
              onClick={() => mPrimary != null && merge(mSelRows, mPrimary)}
            >
              {mSelRows.length < 2 ? "Ən azı 2 profil seçin" : busy === "m" + mPrimary ? "Birləşdirilir..." : `Seçilmiş ${mSelRows.length} profili birləşdir`}
            </button>
          </div>
        )}
      </div>

      {/* 3) Axtar, redaktə et və ya sil */}
      <div className="mng-card">
        <div className="mng-h">Profil redaktəsi və silinməsi</div>
        <p className="mng-sub">Təsdiqlənmişlər daxil istənilən profili axtarın — redaktə edin (ad 4 dildə, sahələr) və ya silin.</p>
        <input className="mng-search" placeholder="Ad, e-poçt və ya ORCID üzrə axtar..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && (
          <div className="mng-results">
            {filtered.length === 0 ? <div className="mng-empty">Nəticə yoxdur.</div> : filtered.map((r) => (
              <div className="mng-row" key={r.id}>
                <div className="mng-info">
                  <b>{r.full_name} <StatusBadge status={r.status} /></b>
                  <span>{[r.position_title, r.kafedra, r.email].filter(Boolean).join(" · ")}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditId(r.id)} style={{ padding: "6px 14px", border: "1px solid #0FA3B1", background: "#fff", color: "#0a7f8a", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Redaktə</button>
                  <button className="mng-del" disabled={busy === "d" + r.id} onClick={() => del(r.id, r.full_name)}>
                    {busy === "d" + r.id ? "..." : "Sil"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editId != null && (
        <EditPanel
          id={editId}
          structure={structure}
          positions={positions}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const pending = status === "pending";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, marginLeft: 4,
      color: pending ? "#92600a" : "#0a7f3f",
      background: pending ? "#fdf1d6" : "#e3f6ea",
      verticalAlign: "middle",
    }}>{statusText(status)}</span>
  );
}

function Group({ rows, busy, onMerge }: { rows: ManageRow[]; busy: string; onMerge: (g: ManageRow[], primaryId: number) => void }) {
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
              <b>{r.full_name} <StatusBadge status={r.status} /></b>
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

// ── Redaktə paneli (modal) ──────────────────────────────────────────────────
type EditData = Record<string, any>;

function EditPanel({ id, structure, positions, onClose, onSaved }: {
  id: number; structure: Structure; positions: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState<EditData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/researcher?id=${id}`);
        const data = await res.json();
        if (!alive) return;
        if (data.ok) setF(data.researcher);
        else setErr(data.message || data.error || "Yüklənmə xətası");
      } catch { if (alive) setErr("Şəbəkə xətası"); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  function up(k: string, v: string) { setF((prev) => ({ ...(prev || {}), [k]: v })); }

  async function save() {
    if (!f) return;
    if (!String(f.full_name || "").trim()) { setErr("Ad (AZ) boş ola bilməz."); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/admin/researcher", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, ...f }),
      });
      const data = await res.json();
      if (data.ok) onSaved();
      else { setErr(data.message || data.error || "Yadda saxlanmadı"); setSaving(false); }
    } catch { setErr("Şəbəkə xətası"); setSaving(false); }
  }

  const facultyOptions = uniq([...Object.keys(structure), f?.faculty]);
  const kafedraOptions = uniq([...(structure[f?.faculty as string] || []), f?.kafedra]);

  const lbl: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3a4a5a", margin: "10px 0 4px" };
  const inp: CSSProperties = { width: "100%", padding: "9px 10px", border: "1px solid #d0d7de", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0A2540" };
  const row2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,26,46,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 760, width: "100%", margin: "24px 0", boxShadow: "0 20px 60px rgba(6,26,46,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #e6e9ee" }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, color: "#0A2540" }}>Profil redaktəsi</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#6b7785", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "8px 22px 22px" }}>
          {loading ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#6b7785" }}>Yüklənir...</div>
          ) : !f ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#c0392b" }}>{err || "Tapılmadı"}</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#6b7785", margin: "8px 0 2px" }}>
                Status: <b>{statusText(f.status)}</b> · {f.works_count ?? 0} nəşr · {f.citations ?? 0} sitat · h-indeks {f.h_index ?? 0} (OpenAlex — redaktə olunmur)
              </div>

              <label style={lbl}>Ad (Azərbaycanca) *</label>
              <input style={inp} value={f.full_name || ""} onChange={(e) => up("full_name", e.target.value)} />

              <div style={row2}>
                <div>
                  <label style={lbl}>Ad (English)</label>
                  <input style={inp} value={f.name_en || ""} onChange={(e) => up("name_en", e.target.value)} placeholder="boşdursa AZ ad göstərilir" />
                </div>
                <div>
                  <label style={lbl}>Ad (Русский)</label>
                  <input style={inp} value={f.name_ru || ""} onChange={(e) => up("name_ru", e.target.value)} placeholder="boşdursa AZ ad göstərilir" />
                </div>
              </div>
              <label style={lbl}>Ad (Türkçe)</label>
              <input style={inp} value={f.name_tr || ""} onChange={(e) => up("name_tr", e.target.value)} placeholder="boşdursa AZ ad göstərilir" />

              <div style={row2}>
                <div>
                  <label style={lbl}>E-poçt</label>
                  <input style={inp} value={f.email || ""} onChange={(e) => up("email", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>ORCID</label>
                  <input style={inp} value={f.orcid || ""} onChange={(e) => up("orcid", e.target.value)} placeholder="0000-0000-0000-0000" />
                </div>
              </div>

              <div style={row2}>
                <div>
                  <label style={lbl}>Fakültə</label>
                  <select style={inp} value={f.faculty || ""} onChange={(e) => { up("faculty", e.target.value); up("kafedra", ""); }}>
                    <option value="">— seçin —</option>
                    {facultyOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Kafedra</label>
                  <select style={inp} value={f.kafedra || ""} onChange={(e) => up("kafedra", e.target.value)}>
                    <option value="">— seçin —</option>
                    {kafedraOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>

              <label style={lbl}>Vəzifə</label>
              <input style={inp} list="pos-list" value={f.position_title || ""} onChange={(e) => up("position_title", e.target.value)} />
              <datalist id="pos-list">{positions.map((p) => <option key={p} value={p} />)}</datalist>

              <label style={lbl}>Tədqiqat sahələri</label>
              <textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} value={f.research_interests || ""} onChange={(e) => up("research_interests", e.target.value)} />

              <label style={lbl}>Bioqrafiya</label>
              <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={f.bio || ""} onChange={(e) => up("bio", e.target.value)} />

              <div style={row2}>
                <div>
                  <label style={lbl}>Foto (URL)</label>
                  <input style={inp} value={f.photo || ""} onChange={(e) => up("photo", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>OpenAlex ID</label>
                  <input style={inp} value={f.openalex_id || ""} onChange={(e) => up("openalex_id", e.target.value)} placeholder="A..." />
                </div>
              </div>
              <div style={row2}>
                <div>
                  <label style={lbl}>LinkedIn</label>
                  <input style={inp} value={f.linkedin || ""} onChange={(e) => up("linkedin", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Vebsayt</label>
                  <input style={inp} value={f.website || ""} onChange={(e) => up("website", e.target.value)} />
                </div>
              </div>
              <div style={row2}>
                <div>
                  <label style={lbl}>Google Scholar ID</label>
                  <input style={inp} value={f.scholar_id || ""} onChange={(e) => up("scholar_id", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>ResearchGate</label>
                  <input style={inp} value={f.researchgate || ""} onChange={(e) => up("researchgate", e.target.value)} />
                </div>
              </div>

              {err && <div style={{ marginTop: 12, color: "#c0392b", fontSize: 13 }}>{err}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{ padding: "9px 16px", border: "1px solid #d0d7de", background: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#3a4a5a" }}>Ləğv et</button>
                <button onClick={save} disabled={saving} style={{ padding: "9px 18px", border: "none", background: "#0FA3B1", color: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saxlanılır..." : "Yadda saxla"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
