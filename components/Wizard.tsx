"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADDA_STRUCTURE, POSITIONS, EMAIL_DOMAINS, isValidAddaEmail } from "@/lib/adda";
import ResearchAreaPicker, { type Area } from "@/components/ResearchAreaPicker";

// research_interests sahəsini oxu: JSON massiv, və ya köhnə vergüllü mətn
function parseAreas(raw: any): Area[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.filter((x) => x && x.name).map((x) => ({ id: x.id || "", name: String(x.name) }));
      } catch {}
    }
    return s.split(",").map((t) => t.trim()).filter(Boolean).map((name) => ({ id: "", name }));
  }
  return [];
}

type Screen = "login" | "hub" | "entry" | "confirm" | "profile";
type Vstatus = { type: "ok" | "warn" | "err" | "loading"; msg: string } | null;
type Verified = { id: string; url?: string } | null;
type OpenAlexStats = { found: boolean; openalexId: string | null; worksCount: number; citations: number; hIndex: number; i10Index: number; name: string | null };
type OrcidVerified = { id: string; name: string; works: number; openalex: OpenAlexStats } | null;

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
  const [vOrcid, setVOrcid] = useState<OrcidVerified>(null);
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

  // profil özü-idarəetməsi
  const [photo, setPhoto] = useState<string>("");
  const [bio, setBio] = useState("");
  const [interestAreas, setInterestAreas] = useState<Area[]>([]);
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);

  // toast + saving
  const [toast, setToast] = useState<{ msg: string; warn?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);

  function showToast(msg: string, warn = false) {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3200);
  }

  // Şəkli brauzerdə 400px-ə kiçildib JPEG data-URI kimi saxlayır
  async function onPhotoPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Yalnız şəkil faylı seçin.", true); return; }
    setPhotoBusy(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.8);
      if (out.length > 350000) { showToast("Şəkil çox böyükdür, daha kiçik seçin.", true); }
      else { setPhoto(out); showToast("Şəkil əlavə edildi."); }
    } catch {
      showToast("Şəkil emal edilə bilmədi.", true);
    } finally {
      setPhotoBusy(false);
    }
  }

  const initials = fullname
    ? fullname.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  // ---------- LOGIN ----------
  async function doLogin() {
    const e = email.trim().toLowerCase();
    const eok = isValidAddaEmail(e);
    const nok = fullname.trim().length >= 3;
    setEmailErr(!eok);
    setNameErr(!nok);
    if (eok && nok) await loadProfileAndEnter(e);
  }
  async function demoLogin() {
    const e = "numune.istifadeci@" + PRIMARY_DOMAIN;
    setEmail(e);
    setFullname("Nümunə İstifadəçi");
    await loadProfileAndEnter(e);
  }
  // Mövcud profili yükləyir — varsa "Mənim profilim"ə, yoxsa "hub"a yönləndirir
  async function loadProfileAndEnter(e: string) {
    try {
      const r = await fetch(`/api/profile?email=${encodeURIComponent(e)}`);
      const d = await r.json();
      if (d.found && d.profile) {
        const p = d.profile;
        if (p.full_name) setFullname(p.full_name);
        setOrcidInput(p.orcid || "");
        if (p.orcid) {
          const hasOa = !!p.openalex_id || (p.works_count || 0) > 0 || (p.citations || 0) > 0 || (p.h_index || 0) > 0;
          setVOrcid({
            id: p.orcid,
            name: p.orcid_name || p.full_name || "",
            works: p.works_count || 0,
            openalex: {
              found: hasOa,
              openalexId: p.openalex_id || null,
              worksCount: p.works_count || 0,
              citations: p.citations || 0,
              hIndex: p.h_index || 0,
              i10Index: p.i10_index || 0,
              name: p.orcid_name || null,
            },
          });
        }
        if (p.scholar_id) { setScholarInput(p.scholar_id); setVScholar({ id: p.scholar_id, url: `https://scholar.google.com/citations?user=${p.scholar_id}` }); }
        if (p.researchgate) { setRgInput(p.researchgate); setVRg({ id: p.researchgate, url: `https://www.researchgate.net/profile/${p.researchgate}` }); }
        setFaculty(p.faculty || "");
        setKafedra(p.kafedra || "");
        setPosition(p.position_title || "");
        setPhoto(p.photo || "");
        setBio(p.bio || "");
        setInterestAreas(parseAreas(p.research_interests));
        setLinkedin(p.linkedin || "");
        setWebsite(p.website || "");
        setMyProfile(p);
        setScreen("profile");
      } else {
        setScreen("hub");
      }
    } catch {
      setScreen("hub");
    }
  }
  function logout() {
    setScreen("login");
    setEmail(""); setFullname("");
    setOrcidInput(""); setScholarInput(""); setRgInput("");
    setVOrcid(null); setVScholar(null); setVRg(null);
    setSOrcid(null); setSScholar(null); setSRg(null);
    setFaculty(""); setKafedra(""); setPosition("");
    setMyProfile(null);
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
    setSOrcid({ type: "loading", msg: "ORCID və OpenAlex bazalarında yoxlanılır..." });
    setOrcidLoading(true);
    try {
      const r = await fetch(`/api/verify-orcid?id=${id}`);
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "tapılmadı");
      const oa: OpenAlexStats = d.openalex || { found: false, openalexId: null, worksCount: 0, citations: 0, hIndex: 0, i10Index: 0, name: null };
      setVOrcid({ id, name: d.name, works: d.works, openalex: oa });
      if (oa.found) {
        setSOrcid({
          type: "ok",
          msg: `Təsdiqləndi: ${d.name} · OpenAlex: ${oa.worksCount} əsər · h-indeks ${oa.hIndex} · ${oa.citations} sitat`,
        });
      } else {
        setSOrcid({
          type: "ok",
          msg: `Təsdiqləndi: ${d.name} · OpenAlex-də profil tapılmadı (yeni ORCID ola bilər — publikasiyalar yığılandan sonra görünəcək)`,
        });
      }
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
          openalex_id: vOrcid?.openalex?.openalexId || null,
          works_count: vOrcid?.openalex?.found ? vOrcid.openalex.worksCount : (vOrcid?.works || 0),
          citations: vOrcid?.openalex?.citations || 0,
          h_index: vOrcid?.openalex?.hIndex || 0,
          i10_index: vOrcid?.openalex?.i10Index || 0,
          scholar_id: vScholar?.id || null,
          researchgate: vRg?.id || null,
          faculty, kafedra, position_title: position,
          photo: photo || null,
          bio: bio.trim() || null,
          research_interests: interestAreas.length ? JSON.stringify(interestAreas) : null,
          linkedin: linkedin.trim() || null,
          website: website.trim() || null,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "xəta");
      const saved = {
        email: email.trim().toLowerCase(),
        full_name: fullname.trim(),
        orcid: vOrcid?.id || null,
        orcid_name: vOrcid?.name || null,
        openalex_id: vOrcid?.openalex?.openalexId || null,
        works_count: vOrcid?.openalex?.found ? vOrcid.openalex.worksCount : (vOrcid?.works || 0),
        citations: vOrcid?.openalex?.citations || 0,
        h_index: vOrcid?.openalex?.hIndex || 0,
        i10_index: vOrcid?.openalex?.i10Index || 0,
        scholar_id: vScholar?.id || null,
        researchgate: vRg?.id || null,
        faculty, kafedra, position_title: position,
        photo: photo || null,
        bio: bio.trim() || null,
        research_interests: interestAreas.length ? JSON.stringify(interestAreas) : null,
        linkedin: linkedin.trim() || null,
        website: website.trim() || null,
      };
      setMyProfile(saved);
      setSaving(false);
      showToast("Profiliniz uğurla yadda saxlanıldı!");
      setTimeout(() => setScreen("profile"), 600);
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
              <div className="la-brand">
                <img src="/adda-logo.png" alt="ADDA" className="la-logo" />
                <div>
                  <div className="la-brand-name">ADDA Elm Portalı</div>
                  <div className="la-brand-en">Current Research Information System</div>
                  <div className="la-brand-az">Cari Tədqiqat İnformasiya Sistemi (CRIS)</div>
                </div>
              </div>
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
              <img src="/adda-logo.png" alt="ADDA" />
            </div>
            <div className="brand-txt"><b>ADDA Elm Portalı</b><span>Cari Tədqiqat İnformasiya Sistemi (CRIS)</span></div>
          </div>
          <div className="topbar-spacer" />
          <div className="user-chip"><div className="av">{initials}</div><span>{fullname}</span></div>
          <button className="btn-ghost" onClick={logout}>Çıxış</button>
        </div>
      </div>

      <div className="shell">
        {screen === "profile" && myProfile && (
          <div className="page">
            <div className="page-head">
              <div className="eyebrow">Mənim profilim</div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div className="prof-photo">
                  {myProfile.photo ? <img src={myProfile.photo} alt="" /> : <span>{initials}</span>}
                </div>
                <div>
                  <h1 style={{ margin: 0 }}>{myProfile.full_name || fullname}</h1>
                  <p style={{ margin: "6px 0 0" }}>{[myProfile.position_title, myProfile.kafedra, myProfile.faculty].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {myProfile.bio && <p style={{ marginTop: 14, maxWidth: 680, color: "var(--muted)" }}>{myProfile.bio}</p>}
            </div>

            <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              <div className="kpi"><div className="ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div><div className="kn">{myProfile.works_count || 0}</div><div className="kl">Publikasiya</div></div>
              <div className="kpi gold"><div className="ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg></div><div className="kn">{myProfile.citations || 0}</div><div className="kl">Sitat</div></div>
              <div className="kpi gold"><div className="ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/></svg></div><div className="kn">{myProfile.h_index || 0}</div><div className="kl">h-indeks</div></div>
            </div>

            <div className="card" style={{ maxWidth: 720 }}>
              <div className="card-pad">
                <div className="card-head">
                  <div className="ci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                  <div><h3>Profil məlumatları</h3><div className="sub">OpenAlex göstəriciləri saxlanılan ən son dəyərlərdir</div></div>
                </div>
                <ConfRow k="E-poçt" v={myProfile.email || email} />
                <ConfRow k="ORCID iD" v={myProfile.orcid || "—"} />
                <ConfRow k="Google Scholar" v={myProfile.scholar_id || "Daxil edilməyib"} />
                <ConfRow k="ResearchGate" v={myProfile.researchgate || "Daxil edilməyib"} />
                <ConfRow k="Fakültə" v={myProfile.faculty || "—"} />
                <ConfRow k="Kafedra" v={myProfile.kafedra || "—"} />
                <ConfRow k="Vəzifə" v={myProfile.position_title || "—"} />
                <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn btn-teal" onClick={() => setScreen("entry")} style={{ width: "auto", padding: "12px 22px" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
                    Məlumatlarımı redaktə et
                  </button>
                  {myProfile.orcid && (
                    <a href={`/r/${myProfile.orcid}`} className="btn btn-back" style={{ width: "auto", padding: "12px 22px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      Tam elmi profilim
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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

                  <hr style={{ border: "none", borderTop: "1px solid var(--line-2)", margin: "24px 0" }} />

                  <div className="id-field">
                    <div className="top"><label><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--teal-dk)" strokeWidth="2" style={{ marginRight: 6 }}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg> Profil şəkli</label></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div className="ph-prev">
                        {photo ? <img src={photo} alt="" /> : <span>{initials}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <label className="btn-verify" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          {photoBusy ? "Emal olunur..." : photo ? "Şəkli dəyiş" : "Şəkil yüklə"}
                          <input type="file" accept="image/*" hidden onChange={(e) => onPhotoPick(e.target.files?.[0])} />
                        </label>
                        {photo && <button className="btn-back" style={{ padding: "8px 14px" }} onClick={() => setPhoto("")}>Sil</button>}
                      </div>
                    </div>
                    <div className="field-hint">JPG/PNG. Avtomatik kiçildilir (400px). Tövsiyə: kvadrat, üz aydın görünən.</div>
                  </div>

                  <div className="id-field">
                    <div className="top"><label>Qısa bioqrafiya</label></div>
                    <textarea className="inp" rows={3} maxLength={600} placeholder="Elmi maraqlar, təhsil, təcrübə haqqında qısa məlumat..." value={bio} onChange={(e) => setBio(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
                    <div className="field-hint">{bio.length}/600 simvol</div>
                  </div>

                  <div className="id-field">
                    <div className="top"><label>Tədqiqat sahələri</label></div>
                    <ResearchAreaPicker value={interestAreas} onChange={setInterestAreas} />
                    <div className="field-hint">Standartlaşdırılmış elmi taksonomiyadan (OpenAlex) seçin — sahə seçdikdə əlaqəli təkliflər avtomatik görünəcək.</div>
                  </div>

                  <div className="id-field">
                    <div className="two-col">
                      <div>
                        <div className="top"><label><span className="src-ic" style={{ background: "#0a66c2", color: "#fff" }}>in</span> LinkedIn</label></div>
                        <input className="inp" placeholder="linkedin.com/in/..." value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                      </div>
                      <div>
                        <div className="top"><label><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--teal-dk)" strokeWidth="2" style={{ marginRight: 5 }}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20a15 15 0 010-20"/></svg> Şəxsi sayt</label></div>
                        <input className="inp" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="btn btn-back" onClick={() => setScreen(myProfile ? "profile" : "hub")} style={{ flex: 0.5 }}>Geri</button>
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
                <ConfRow k="ORCID iD" v={vOrcid?.id || ""} pill="ok" />
                {vOrcid?.openalex?.found ? (
                  <>
                    <ConfRow k="Publikasiya (OpenAlex)" v={String(vOrcid.openalex.worksCount)} pill="ok" />
                    <ConfRow k="h-indeks" v={String(vOrcid.openalex.hIndex)} pill="ok" />
                    <ConfRow k="Sitat sayı" v={String(vOrcid.openalex.citations)} pill="ok" />
                  </>
                ) : (
                  <ConfRow k="OpenAlex" v="Profil tapılmadı (publikasiya 0)" pill="warn" />
                )}
                <ConfRow k="Google Scholar" v={vScholar ? vScholar.id : "Daxil edilməyib"} pill={vScholar ? "warn" : "none"} />
                <ConfRow k="ResearchGate" v={vRg ? vRg.id : "Daxil edilməyib"} pill={vRg ? "warn" : "none"} />
                <ConfRow k="Fakültə" v={faculty} />
                <ConfRow k="Kafedra" v={kafedra} />
                <ConfRow k="Vəzifə" v={position} />
                <div className="cf-meta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <span>Publikasiya, sitat və h-indeks göstəriciləriniz OpenAlex açıq bazasından avtomatik alındı. Məlumatları sonradan yeniləyə bilərsiniz.</span>
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
