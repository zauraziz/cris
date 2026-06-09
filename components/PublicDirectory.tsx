"use client";

import { useMemo, useState } from "react";

export type DirItem = {
  full_name: string;
  orcid: string | null;
  faculty: string | null;
  kafedra: string | null;
  position_title: string | null;
  works_count: number;
  citations: number;
  h_index: number;
  photo: string | null;
  research_interests: string | null;
};

function areaNames(raw: string | null): string[] {
  const s = (raw || "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((x: any) => (x && x.name ? String(x.name) : "")).filter(Boolean);
    } catch {}
  }
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

type Sort = "citations" | "works" | "name";

export default function PublicDirectory({ items, faculties }: { items: DirItem[]; faculties: string[] }) {
  const [q, setQ] = useState("");
  const [faculty, setFaculty] = useState("");
  const [sort, setSort] = useState<Sort>("citations");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items.filter((r) => {
      if (faculty && r.faculty !== faculty) return false;
      if (!needle) return true;
      const hay = [r.full_name, r.kafedra, r.position_title, r.research_interests].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.full_name.localeCompare(b.full_name, "az");
      if (sort === "works") return (b.works_count || 0) - (a.works_count || 0);
      return (b.citations || 0) - (a.citations || 0);
    });
    return list;
  }, [items, q, faculty, sort]);

  return (
    <div>
      <div className="dir-toolbar">
        <div className="dir-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          <input value={q} placeholder="Ad, kafedra və ya tədqiqat sahəsi üzrə axtar..." onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="sel dir-sel" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
          <option value="">Bütün fakültələr</option>
          {faculties.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select className="sel dir-sel" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="citations">Sitata görə</option>
          <option value="works">Publikasiyaya görə</option>
          <option value="name">Ada görə (A-Z)</option>
        </select>
      </div>

      <div className="dir-count">{filtered.length} tədqiqatçı</div>

      <div className="dir-grid">
        {filtered.map((r, i) => {
          const areas = areaNames(r.research_interests).slice(0, 3);
          const inner = (
            <>
              <div className="dc-top">
                <div className="dc-avatar">
                  {r.photo ? <img src={r.photo} alt="" /> : <span>{initials(r.full_name)}</span>}
                </div>
                <div className="dc-id">
                  <div className="dc-name">{r.full_name}</div>
                  <div className="dc-pos">{[r.position_title, r.kafedra].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              {areas.length > 0 && (
                <div className="dc-areas">
                  {areas.map((a, j) => <span className="dc-chip" key={j}>{a}</span>)}
                </div>
              )}
              <div className="dc-metrics">
                <span><b>{r.works_count}</b> publikasiya</span>
                <span><b>{r.citations}</b> sitat</span>
                <span>h-indeks <b>{r.h_index}</b></span>
              </div>
            </>
          );
          return r.orcid ? (
            <a className="dir-card" href={`/r/${r.orcid}`} key={r.orcid + i}>{inner}</a>
          ) : (
            <div className="dir-card no-link" key={"n" + i}>{inner}</div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card"><div className="card-pad" style={{ textAlign: "center", color: "var(--faint)" }}>
          Axtarışa uyğun tədqiqatçı tapılmadı.
        </div></div>
      )}
    </div>
  );
}
