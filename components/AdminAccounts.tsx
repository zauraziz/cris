"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AdminAccount = {
  id: number;
  username: string;
  role: string;
  faculty: string | null;
  kafedra: string | null;
  name: string | null;
};

export default function AdminAccounts({ accounts, structure }: { accounts: AdminAccount[]; structure: Record<string, string[]> }) {
  const router = useRouter();
  const faculties = Object.keys(structure);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("head");
  const [faculty, setFaculty] = useState(faculties[0] || "");
  const [kafedra, setKafedra] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const kafedras = faculty ? structure[faculty] || [] : [];

  async function create() {
    setMsg(null);
    if (username.trim().length < 3 || password.length < 6) {
      setMsg({ ok: false, text: "İstifadəçi adı (≥3) və parol (≥6) tələb olunur." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, role, faculty, kafedra: role === "head" ? kafedra : null }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ ok: true, text: "Hesab yaradıldı." });
        setName(""); setUsername(""); setPassword(""); setKafedra("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: data.message || "Xəta baş verdi." });
      }
    } catch { setMsg({ ok: false, text: "Şəbəkə xətası." }); }
    setBusy(false);
  }

  async function remove(id: number, label: string) {
    if (!confirm(`«${label}» admin hesabı silinsin?`)) return;
    try {
      const res = await fetch("/api/admin/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (data.ok) router.refresh();
      else alert("Xəta: " + (data.message || data.error));
    } catch { alert("Şəbəkə xətası."); }
  }

  return (
    <div className="acc">
      <div className="acc-form">
        <div className="acc-grid">
          <div className="acc-field"><label>Ad, Soyad</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Məsələn: Elşən Sultanov" /></div>
          <div className="acc-field"><label>İstifadəçi adı</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mudir.elektro" /></div>
          <div className="acc-field"><label>Parol</label><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ən azı 6 simvol" /></div>
          <div className="acc-field"><label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="head">Kafedra müdiri</option>
              <option value="dean">Dekan</option>
            </select>
          </div>
          <div className="acc-field"><label>Fakültə</label>
            <select value={faculty} onChange={(e) => { setFaculty(e.target.value); setKafedra(""); }}>
              {faculties.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          {role === "head" && (
            <div className="acc-field"><label>Kafedra</label>
              <select value={kafedra} onChange={(e) => setKafedra(e.target.value)}>
                <option value="">Seçin...</option>
                {kafedras.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
          )}
        </div>
        {msg && <div className={"acc-msg" + (msg.ok ? " ok" : " err")}>{msg.text}</div>}
        <button className="acc-btn" disabled={busy} onClick={create}>{busy ? "Yaradılır..." : "Admin hesabı yarat"}</button>
      </div>

      <div className="acc-list">
        <div className="acc-list-h">Mövcud admin hesabları ({accounts.length})</div>
        {accounts.length === 0 ? (
          <div className="mng-empty">Hələ dinamik admin hesabı yoxdur.</div>
        ) : accounts.map((a) => (
          <div className="acc-row" key={a.id}>
            <div className="acc-info">
              <b>{a.name || a.username}</b>
              <span>@{a.username} · {a.role === "dean" ? "Dekan" : "Kafedra müdiri"} · {a.role === "dean" ? a.faculty : a.kafedra}</span>
            </div>
            <button className="mng-del" onClick={() => remove(a.id, a.name || a.username)}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}
