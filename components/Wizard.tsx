"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADDA_STRUCTURE, POSITIONS, EMAIL_DOMAINS, isValidAddaEmail } from "@/lib/adda";

type Screen = "login" | "hub" | "entry" | "confirm";
type Vstatus = { type: "ok" | "warn" | "err" | "loading"; msg: string } | null;
type Verified = { id: string; name?: string; works?: number; url?: string } | null;

const FACULTIES = Object.keys(ADDA_STRUCTURE);
const PRIMARY_DOMAIN = EMAIL_DOMAINS[0] || "adda.edu.az";

export default function Wizard() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("login");

  // login
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [emailErr, setEmailErr] = useState(false);
  const [nameErr, setNameErr] = useState(false);

  // id inputs
  const [orcidInput, setOrcidInput] = useState("");
  const [scholarInput, setScholarInput] = useState("");
  const [rgInput, setRgInput] = useState("");

  // verification
  const [vOrcid, setVOrcid] = useState<Verified>(null);
  const [vScholar, setVScholar] = useState<Verified>(null);
  const [vRg, setVRg] = useState<Verified>(null);
  const [sOrcid, setSOrcid] = useState<Vstatus>(null);
  const [sScholar, setSScholar] = useState<Vstatus>(null);
  const [sRg, setSRg] = useState<Vstatus>(null);
  const [orcidLoading, setOrcidLoading] = useState(false);

  // help toggles
  const [help, setHelp] = useState<Record<string, boolean>>({});

  // affiliation
  const [faculty, setFaculty] = useState("");
  const [kafedra, setKafedra] = useState("");
  const [position, setPosition] = useState("");

  // toast + saving
  const [toast, setToast] = useState<{ msg: string; warn?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  function showToast(msg: string, warn = false) {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3200);
  }

  const initials = fullname
    ? fullname.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  // ---------- LOGIN ----------
  function doLogin() {
    const e = email.trim().toLowerCase();
    const eok = isValidAddaEmail(e);
    const nok = fullname.trim().length >= 3;
    setEmailErr(!eok);
    setNameErr(!nok);
    if (eok && nok) setScreen("hub");
  }
  function demoLogin() {
    setEmail("numune.istifadeci@" + PRIMARY_DOMAIN);
    setFullname("Nümunə İstifadəçi");
    setScreen("hub");
  }
  function logout() {
    setScreen("login");
    setEmail(""); setFullname("");
    setOrcidInput(""); setScholarInput(""); setRgInput("");
    setVOrcid(null); setVScholar(null); setVRg(null);
    setSOrcid(null); setSScholar(null); setSRg(null);
    setFaculty(""); setKafedra(""); setPosition("");
  }

  // ---------- ORCID format ----------
  function formatOrcid(v: string) {
    const clean = v.replace(/[^0-9Xx]/g, "").toUpperCase().slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setOrcidInput(parts ? parts.join("-") : clean);
  }

  // ---------- VERIFY ORCID (server API) ----------
  async function verifyOrcid() {
    const id = orcidInput.trim().toUpperCase();
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) {
      setSOrcid({ type: "err", msg: "Format yanlışdır. Düzgün format: 0000-0000-0000-0000" });
      return;
    }
    setSOrcid({ type: "loading", msg: "Beynəlxalq ORCID bazasında yoxlanılır..." });
    setOrcidLoading(true);
    try {
      const r = await fetch(`/api/verify-orcid?id=${id}`);
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "tapılmadı");
      setVOrcid({ id, name: d.name, works: d.works });
      setSOrcid({ type: "ok", msg: `Təsdiqləndi: ${d.name} · ${d.works} əsər tapıldı` });
    } catch (err: any) {
      setVOrcid(null);
      setSOrcid({ type: "err", msg: "Bu ORCID iD beynəlxalq bazada tapılmadı. Nömrəni yoxlayın." });
    } finally {
      setOrcidLoading(false);
    }
  }

  function verifyScholar() {
    const id = scholarInput.trim();
    if (!id) { setSScholar({ type: "err", msg: "ID daxil edin və ya boş buraxın." }); return; }
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) { setSScholar({ type: "err", msg: "Format uyğun deyil." }); return; }
    setVScholar({ id, url: `https://scholar.google.com/citations?user=${id}` });
    setSScholar({ type: "warn", msg: "Format düzgündür · profil linki yaradıldı (tam yoxlama növbəti mərhələdə)" });
  }

  function verifyRG() {
    const id = rgInput.trim();
    if (!id) { setSRg({ type: "err", msg: "Profil adı daxil edin və ya boş buraxın." }); return; }
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(id)) { setSRg({ type: "err", msg: "Format uyğun deyil." }); return; }
    setVRg({ id, url: `https://www.researchgate.net/profile/${id}` });
    setSRg({ type: "warn", msg: "Format düzgündür · profil linki yaradıldı (tam yoxlama növbəti mərhələdə)" });
  }

  function toggleHelp(k: string) {
    setHelp((h) => ({ ...h, [k]: !h[k] }));
  }

  // ---------- GO CONFIRM ----------
  function goConfirm() {
    if (!vOrcid) { showToast("Zəhmət olmasa ORCID iD-ni daxil edib yoxlayın (məcburidir).", true); return; }
    if (!faculty || !kafedra) { showToast("Zəhmət olmasa fakültə və kafedranı seçin.", true); return; }
    if (!position) { showToast("Zəhmət olmasa vəzifənizi seçin.", true); return; }
    setScreen("confirm");
  }

  // ---------- CONFIRM & SAVE ----------
  async function confirmProfile() {
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullname.trim(),
          orcid: vOrcid?.id || null,
          orcid_name: vOrcid?.name || null,
          works_count: vOrcid?.works || 0,
          scholar_id: vScholar?.id || null,
          researchgate: vRg?.id || null,
          faculty, kafedra, position_title: position,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "xəta");
      showToast("Profiliniz uğurla təsdiqləndi və bazaya əlavə olundu!");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      showToast("Saxlama zamanı xəta: " + (err.message || "naməlum"), true);
      setSaving(false);
    }
  }

  // ============ RENDER ============
  if (screen === "login") {
    return (
      <>
        <div className="login-wrap">
          <div className="login-art">
            <div className="la-top">
              <span className="la-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                TURMARIN · M1 Pilotu
              </span>
              <h1 className="la-title">ADDA-nın elmi<br/>mənzərəsi —<br/>bir platformada</h1>
              <p className="la-sub">Akademiyanın professor-müəllim heyətinin elmmetrik profillərini beynəlxalq bazalarla birləşdirən rəqəmsal sistem.</p>
            </div>
            <div className="la-points">
              <Point icon={<path d="M20 6L9 17l-5-5"/>} b="Avtomatik yoxlama" s="ORCID, Google Scholar və ResearchGate ID-ləri" />
              <Point icon={<><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>} b="Fakültə və kafedra analitikası" s="Real vaxt elmmetrik göstəricilər" />
              <Point icon={<path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>} b="Sıfır lisenziya xərci" s="Açıq mənbə infrastrukturu (OpenAlex)" />
            </div>
            <div className="la-foot">Azərbaycan Dövlət Dəniz Akademiyası · Bakı 2026</div>
          </div>

          <div className="login-form">
            <div className="lf-card">
              <h2>Sistemə daxil olun</h2>
              <p className="lf-lead">Profilinizi tamamlamaq üçün ADDA korporativ e-poçt ünvanınızla daxil olun.</p>
              <div className="field">
                <label>ADDA korporativ e-poçt</label>
                <input className={"inp" + (emailErr ? " err" : "")} type="email" placeholder={"ad.soyad@" + PRIMARY_DOMAIN}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()} />
                {emailErr && <div className="err-msg">Zəhmət olmasa düzgün ADDA e-poçt ünvanı (@{PRIMARY_DOMAIN}) daxil edin.</div>}
              </div>
              <div className="field">
                <label>Tam adınız</label>
                <input className={"inp" + (nameErr ? " err" : "")} type="text" placeholder="Məsələn: Eldar Qocayev"
                  value={fullname} onChange={(e) => setFullname(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()} />
                {nameErr && <div className="err-msg">Zəhmət olmasa adınızı daxil edin.</div>}
              </div>
              <button className="btn btn-primary" onClick={doLogin}>
                Daxil ol
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </button>
              <p className="lf-note">Daxil olmaqla, məlumatlarınızın ADDA-nın institusional elmmetrik bazasında saxlanmasına razılıq vermiş olursunuz.</p>
              <div className="lf-demo"><button onClick={demoLogin}>Sınaq üçün nümunə hesabla daxil ol →</button></div>
            </div>
          </div>
        </div>
        {toast && <Toast {...toast} />}
      </>
    );
  }

  // ---- authenticated screens share topbar ----
  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <div className="brand" onClick={() => setScreen("hub")}>
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>
            </div>
            <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Elmmetrik Profil Sistemi</span></div>
          </div>
          <div className="topbar-spacer" />
          <a className="btn-ghost" href="/dashboard">Analitika</a>
          <div className="user-chip"><div className="av">{initials}</div><span>{fullname}</span></div>
          <button className="btn-ghost" onClick={logout}>Çıxış</button>
        </div>
      </div>

      <div className="shell">
        {screen === "hub" && (
          <div className="page">
            <div className="page-head">
              <div className="eyebrow">Xoş gəldiniz</div>
              <h1>Salam, {fullname.split(" ")[0]}!</h1>
              <p>Elmmetrik profilinizi tamamlamaq cəmi bir neçə dəqiqə çəkir. Aşağıdakı addımları izləyin — sağdakı bələdçi sizə kömək edəcək.</p>
            </div>

            <Stepper current={2} />

            <div className="grid-2">
              <div className="card">
                <div className="card-pad">
                  <div className="card-head">
                    <div className="ci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
                    <div><h3>Elmi profilinizi tamamlayın</h3><div className="sub">Beynəlxalq identifikatorlarınızı və akademik mənsubiyyətinizi əlavə edin</div></div>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, marginBottom: 22 }}>
                    Sistem sizin ORCID, Google Scholar və ResearchGate ID-lərinizi qəbul edir, onları beynəlxalq bazalarla yoxlayır və publikasiyalarınızı avtomatik toplayır. Bu, ADDA-nın ümumi elmi mənzərəsinin formalaşmasına töhfə verir.
                  </p>
                  <button className="btn btn-teal" onClick={() => setScreen("entry")}>
                    Məlumatlarımı daxil edim
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </button>
                </div>
              </div>

              <div className="card guide">
                <div className="card-pad">
                  <div className="g-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    Bələdçi: ID-lərinizi haradan tapırsınız?
                  </div>
                  <GuideItem n="1" b="ORCID iD" >
                    <a href="https://orcid.org" target="_blank" style={{ color: "var(--teal-dk)", fontWeight: 600 }}>orcid.org</a> saytına daxil olun. Sağ yuxarıda adınızın altında <code>0000-0000-0000-0000</code> formatında 16 rəqəmli nömrəniz var.
                  </GuideItem>
                  <GuideItem n="2" b="Google Scholar">
                    <a href="https://scholar.google.com" target="_blank" style={{ color: "var(--teal-dk)", fontWeight: 600 }}>scholar.google.com</a>-da profilinizə keçin. Linkdəki <code>user=</code> hissəsindən sonrakı kod sizin ID-nizdir.
                  </GuideItem>
                  <GuideItem n="3" b="ResearchGate">
                    <a href="https://researchgate.net" target="_blank" style={{ color: "var(--teal-dk)", fontWeight: 600 }}>researchgate.net</a> profilinizin linkindəki <code>/profile/</code>-dan sonrakı ad hissəsi.
                  </GuideItem>
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #cfe6e9", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                    <b style={{ color: "var(--navy)" }}>Qeyd:</b> Yalnız ORCID iD məcburidir. Digər ikisi isteğe bağlıdır, lakin profilinizi zənginləşdirir.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "entry" && (
          <div className="page">
            <div className="page-head">
              <div className="eyebrow">Addım 2 · Məlumatların daxil edilməsi</div>
              <h1>Elmi identifikatorlarınız</h1>
              <p>ID-lərinizi daxil edib "Yoxla" düyməsinə basın. ORCID real vaxtda beynəlxalq bazadan yoxlanılacaq.</p>
            </div>

            <div style={{ maxWidth: 720 }}>
              <div className="card">
                <div className="card-pad">
                  {/* ORCID */}
                  <div className="id-field">
                    <div className="top">
                      <label><span className="src-ic src-orcid">iD</span> ORCID iD <span style={{ color: "#d9534f" }}>*</span></label>
                      <button className="help-toggle" onClick={() => toggleHelp("orcid")}>Kömək <Chevron/></button>
                    </div>
                    <div className="row-inp">
                      <input className="inp" placeholder="0000-0000-0000-0000" value={orcidInput} onChange={(e) => formatOrcid(e.target.value)} />
                      <button className="btn-verify" onClick={verifyOrcid} disabled={orcidLoading}>Yoxla</button>
                    </div>
                    {help.orcid && <div className="help-box"><b>Haradan tapım?</b> <a href="https://orcid.org/signin" target="_blank" style={{ color: "var(--teal-dk)" }}>orcid.org</a>-a daxil olun → adınızın altındakı nömrə. Format: <code>0000-0000-0000-0000</code> (sonuncu simvol X ola bilər).</div>}
                    {sOrcid && <StatusLine {...sOrcid} />}
                  </div>

                  {/* Scholar */}
                  <div className="id-field">
                    <div className="top">
                      <label><span className="src-ic src-scholar">G</span> Google Scholar ID</label>
                      <button className="help-toggle" onClick={() => toggleHelp("scholar")}>Kömək <Chevron/></button>
                    </div>
                    <div className="row-inp">
                      <input className="inp" placeholder="Məsələn: AbCdEfGhIjK" value={scholarInput} onChange={(e) => setScholarInput(e.target.value)} />
                      <button className="btn-verify" onClick={verifyScholar}>Yoxla</button>
                    </div>
                    {help.scholar && <div className="help-box"><b>Haradan tapım?</b> Google Scholar profilinizin linkinə baxın:<br/><code>scholar.google.com/citations?user=<b>AbCdEfGhIjK</b></code></div>}
                    {sScholar && <StatusLine {...sScholar} />}
                  </div>

                  {/* ResearchGate */}
                  <div className="id-field">
                    <div className="top">
                      <label><span className="src-ic src-rg">RG</span> ResearchGate profili</label>
                      <button className="help-toggle" onClick={() => toggleHelp("rg")}>Kömək <Chevron/></button>
                    </div>
                    <div className="row-inp">
                      <input className="inp" placeholder="Məsələn: Eldar-Qocayev" value={rgInput} onChange={(e) => setRgInput(e.target.value)} />
                      <button className="btn-verify" onClick={verifyRG}>Yoxla</button>
                    </div>
                    {help.rg && <div className="help-box"><b>Haradan tapım?</b> ResearchGate profilinizin linkinə baxın:<br/><code>researchgate.net/profile/<b>Eldar-Qocayev</b></code></div>}
                    {sRg && <StatusLine {...sRg} />}
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--line-2)", margin: "24px 0" }} />

                  <div className="id-field">
                    <div className="top"><label><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--teal-dk)" strokeWidth="2" style={{ marginRight: 6 }}><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg> Akademik mənsubiyyət</label></div>
                    <div className="two-col">
                      <select className="sel" value={faculty} onChange={(e) => { setFaculty(e.target.value); setKafedra(""); }}>
                        <option value="">Fakültə seçin...</option>
                        {FACULTIES.map((f) => <option key={f}>{f}</option>)}
                      </select>
                      <select className="sel" value={kafedra} onChange={(e) => setKafedra(e.target.value)} disabled={!faculty}>
                        <option value="">{faculty ? "Kafedra seçin..." : "Əvvəlcə fakültə seçin"}</option>
                        {faculty && ADDA_STRUCTURE[faculty].map((k) => <option key={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="id-field">
                    <div className="top"><label>Vəzifə / elmi ad</label></div>
                    <select className="sel" value={position} onChange={(e) => setPosition(e.target.value)}>
                      <option value="">Vəzifə seçin...</option>
                      {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="form-actions">
                    <button className="btn btn-back" onClick={() => setScreen("hub")} style={{ flex: 0.5 }}>Geri</button>
                    <button className="btn btn-teal" onClick={goConfirm}>Davam et → Təsdiq</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "confirm" && (
          <div className="page">
            <div className="page-head" style={{ textAlign: "center" }}>
              <div className="eyebrow">Addım 4 · Təsdiq</div>
              <h1>Məlumatlarınızı təsdiqləyin</h1>
              <p style={{ marginLeft: "auto", marginRight: "auto" }}>Aşağıdakı məlumatların düzgünlüyünü yoxlayın. Təsdiqlədikdən sonra profiliniz ADDA elmmetrik bazasına əlavə olunacaq.</p>
            </div>
            <div className="card confirm-card">
              <div className="card-pad">
                <ConfRow k="Ad, soyad" v={fullname} />
                <ConfRow k="E-poçt" v={email} />
                <ConfRow k="ORCID iD" v={`${vOrcid?.id} · ${vOrcid?.works} əsər`} pill="ok" />
                <ConfRow k="Google Scholar" v={vScholar ? vScholar.id : "Daxil edilməyib"} pill={vScholar ? "warn" : "none"} />
                <ConfRow k="ResearchGate" v={vRg ? vRg.id : "Daxil edilməyib"} pill={vRg ? "warn" : "none"} />
                <ConfRow k="Fakültə" v={faculty} />
                <ConfRow k="Kafedra" v={kafedra} />
                <ConfRow k="Vəzifə" v={position} />
                <div className="cf-meta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <span>Təsdiqlədikdən sonra publikasiyalarınız OpenAlex və Crossref bazalarından avtomatik toplanacaq. Məlumatları sonradan yeniləyə bilərsiniz.</span>
                </div>
                <div className="form-actions">
                  <button className="btn btn-back" onClick={() => setScreen("entry")} style={{ flex: 0.5 }} disabled={saving}>Düzəliş et</button>
                  <button className="btn btn-primary" onClick={confirmProfile} disabled={saving}>
                    {saving ? "Saxlanılır..." : "Təsdiqlə və yadda saxla"}
                    {!saving && <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast {...toast} />}
    </>
  );
}

// ============ small components ============
function Point({ icon, b, s }: { icon: React.ReactNode; b: string; s: string }) {
  return (
    <div className="la-point">
      <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg></div>
      <div><b>{b}</b><span>{s}</span></div>
    </div>
  );
}
function GuideItem({ n, b, children }: { n: string; b: string; children: React.ReactNode }) {
  return (
    <div className="g-item">
      <div className="n">{n}</div>
      <div><b>{b}</b><p>{children}</p></div>
    </div>
  );
}
function Chevron() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>;
}
function StatusLine({ type, msg }: { type: string; msg: string }) {
  const icons: Record<string, React.ReactNode> = {
    ok: <path d="M20 6L9 17l-5-5"/>,
    warn: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
    err: <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></>,
    loading: <path d="M21 12a9 9 0 11-6.2-8.5"/>,
  };
  return (
    <div className={"vstatus " + type}>
      <svg className={type === "loading" ? "spin" : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">{icons[type]}</svg>
      <span>{msg}</span>
    </div>
  );
}
function ConfRow({ k, v, pill }: { k: string; v: string; pill?: "ok" | "warn" | "none" }) {
  const labels: Record<string, string> = { ok: "Yoxlanıldı", warn: "Format OK", none: "Yoxdur" };
  return (
    <div className="cf-row">
      <div className="k">{k}</div>
      <div className="v">{v} {pill && <span className={"pill " + pill}>{labels[pill]}</span>}</div>
    </div>
  );
}
function Stepper({ current }: { current: number }) {
  const steps = ["Daxil oldunuz", "ID-ləri daxil edin", "Yoxlama", "Təsdiq"];
  return (
    <div className="stepper">
      {steps.map((label, i) => {
        const n = i + 1;
        const cls = n < current ? "done" : n === current ? "current" : "";
        return (
          <span key={n} style={{ display: "contents" }}>
            <div className={"step " + cls}><div className="dot">{n < current ? "✓" : n}</div><div className="lbl">{label}</div></div>
            {n < steps.length && <div className={"step-line" + (n < current ? " done" : "")} />}
          </span>
        );
      })}
    </div>
  );
}
function Toast({ msg, warn }: { msg: string; warn?: boolean }) {
  return (
    <div className="toast show" style={{ background: warn ? "#b8860f" : "var(--navy)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6L9 17l-5-5"/></svg>
      <span>{msg}</span>
    </div>
  );
}
