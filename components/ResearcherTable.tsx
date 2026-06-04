"use client";

import { useMemo, useState } from "react";

export type Researcher = {
  full_name: string;
  email: string;
  orcid: string | null;
  faculty: string;
  kafedra: string;
  position_title: string | null;
  works_count: number;
  citations: number;
  h_index: number;
  scholar_id: string | null;
  researchgate: string | null;
  updated_at: string;
};

type SortKey = "full_name" | "faculty" | "kafedra" | "position_title" | "works_count" | "citations" | "h_index" | "updated_at";

export default function ResearcherTable({ rows }: { rows: Researcher[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("citations");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = rows;
    if (term) {
      r = rows.filter((x) =>
        [x.full_name, x.email, x.faculty, x.kafedra, x.position_title, x.orcid]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(term))
      );
    }
    const sorted = [...r].sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (typeof va === "number" && typeof vb === "number") return asc ? va - vb : vb - va;
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return sorted;
  }, [rows, q, sortKey, asc]);

  function setSort(k: SortKey) {
    if (k === sortKey) setAsc(!asc);
    else { setSortKey(k); setAsc(false); }
  }

  function exportCsv() {
    const headers = ["Ad Soyad", "E-poçt", "ORCID", "Fakültə", "Kafedra", "Vəzifə", "Publikasiya", "Sitat", "h-indeks", "Scholar", "ResearchGate", "Yeniləndi"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        r.full_name, r.email, r.orcid || "", r.faculty, r.kafedra, r.position_title || "",
        r.works_count, r.citations, r.h_index, r.scholar_id || "", r.researchgate || "",
        new Date(r.updated_at).toLocaleDateString("az-AZ"),
      ].map((c) => {
        const s = String(c ?? "");
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(row.join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adda-tedqiqatcilar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const arrow = (k: SortKey) => (sortKey === k ? (asc ? " ▲" : " ▼") : "");

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="tbl-toolbar">
        <div className="tbl-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
          <input placeholder="Ad, kafedra, ORCID üzrə axtar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tbl-count">{filtered.length} tədqiqatçı</div>
        <button className="btn-verify" onClick={exportCsv} style={{ padding: "8px 14px" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5, verticalAlign: -2 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          CSV ixrac
        </button>
      </div>
      <div className="tbl-scroll">
        <table className="rtbl">
          <thead>
            <tr>
              <th onClick={() => setSort("full_name")}>Ad, soyad{arrow("full_name")}</th>
              <th onClick={() => setSort("faculty")}>Fakültə{arrow("faculty")}</th>
              <th onClick={() => setSort("kafedra")}>Kafedra{arrow("kafedra")}</th>
              <th onClick={() => setSort("position_title")}>Vəzifə{arrow("position_title")}</th>
              <th>ORCID</th>
              <th className="num" onClick={() => setSort("works_count")}>Pub.{arrow("works_count")}</th>
              <th className="num" onClick={() => setSort("citations")}>Sitat{arrow("citations")}</th>
              <th className="num" onClick={() => setSort("h_index")}>h-ind.{arrow("h_index")}</th>
              <th onClick={() => setSort("updated_at")}>Yeniləndi{arrow("updated_at")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="tbl-empty">Nəticə tapılmadı</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.email + i}>
                <td><div className="tbl-name">{r.full_name}</div><div className="tbl-mail">{r.email}</div></td>
                <td>{r.faculty}</td>
                <td>{r.kafedra}</td>
                <td>{r.position_title || "—"}</td>
                <td>
                  {r.orcid ? (
                    <a href={`https://orcid.org/${r.orcid}`} target="_blank" rel="noreferrer" className="tbl-orcid">{r.orcid}</a>
                  ) : "—"}
                </td>
                <td className="num">{r.works_count}</td>
                <td className="num strong">{r.citations}</td>
                <td className="num strong">{r.h_index}</td>
                <td className="tbl-date">{new Date(r.updated_at).toLocaleDateString("az-AZ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
