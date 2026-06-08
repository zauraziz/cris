"use client";

import { useEffect, useRef, useState } from "react";

export type Area = { id: string; name: string };

type Topic = {
  id: string;
  display_name: string;
  subfield?: { id: string; display_name: string };
  field?: { id: string; display_name: string };
  domain?: { id: string; display_name: string };
};

const OA = "https://api.openalex.org";
const MAILTO = "info@adda.edu.az";

// Dənizçilik akademiyası üçün ən uyğun OpenAlex sahələri (field id-ləri sabitdir)
const FIELDS: { id: string; name: string }[] = [
  { id: "22", name: "Mühəndislik" },
  { id: "21", name: "Energetika" },
  { id: "19", name: "Yer və planet elmləri" },
  { id: "23", name: "Ətraf mühit elmləri" },
  { id: "17", name: "Kompüter elmləri" },
  { id: "25", name: "Materialşünaslıq" },
  { id: "26", name: "Riyaziyyat" },
  { id: "31", name: "Fizika və astronomiya" },
  { id: "18", name: "Qərar elmləri" },
  { id: "14", name: "Biznes və idarəetmə" },
];

const numId = (url?: string) => (url ? url.split("/").pop() || "" : "");
const shortId = (url: string) => url.replace("https://openalex.org/", "");

export default function ResearchAreaPicker({
  value,
  onChange,
}: {
  value: Area[];
  onChange: (a: Area[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Topic[]>([]);
  const [related, setRelated] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState("");
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Axtar (yazdıqca)
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    if (q.trim().length < 2) {
      if (!activeField) setResults([]);
      return;
    }
    deb.current = setTimeout(async () => {
      setLoading(true);
      setActiveField("");
      try {
        const r = await fetch(`${OA}/topics?search=${encodeURIComponent(q.trim())}&per-page=8&mailto=${MAILTO}`);
        const d = await r.json();
        setResults(d?.results || []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 320);
  }, [q]); // eslint-disable-line

  async function loadField(fid: string) {
    setQ("");
    setActiveField(fid);
    setLoading(true);
    try {
      const r = await fetch(`${OA}/topics?filter=field.id:${fid}&sort=works_count:desc&per-page=12&mailto=${MAILTO}`);
      const d = await r.json();
      setResults(d?.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }

  // Birinci seçimlə əlaqəli mövzular (eyni alt-sahədən)
  async function loadRelated(t: Topic) {
    const sf = numId(t.subfield?.id);
    if (!sf) return;
    try {
      const r = await fetch(`${OA}/topics?filter=subfield.id:${sf}&sort=works_count:desc&per-page=10&mailto=${MAILTO}`);
      const d = await r.json();
      setRelated((d?.results || []) as Topic[]);
    } catch {
      /* ignore */
    }
  }

  function add(t: Topic) {
    const id = shortId(t.id);
    if (value.some((v) => v.id === id)) return;
    onChange([...value, { id, name: t.display_name }]);
    loadRelated(t);
    setQ("");
    setResults([]);
    setActiveField("");
  }

  function addCustom() {
    const name = q.trim();
    if (name.length < 2 || value.some((v) => v.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, { id: "", name }]);
    setQ("");
    setResults([]);
  }

  function remove(id: string, name: string) {
    onChange(value.filter((v) => !(v.id === id && v.name === name)));
  }

  const picked = (t: Topic) => value.some((v) => v.id === shortId(t.id));

  return (
    <div className="rap">
      {/* Seçilmişlər */}
      {value.length > 0 && (
        <div className="rap-selected">
          {value.map((a, i) => (
            <span className="rap-chip sel" key={a.id + i}>
              {a.name}
              <button onClick={() => remove(a.id, a.name)} aria-label="Sil">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Axtarış */}
      <div className="rap-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
        <input
          value={q}
          placeholder="Sahə axtar (məs. naviqasiya, energetika, korroziya)..."
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && <span className="rap-spin" />}
      </div>

      {/* Axtarış / sahə nəticələri */}
      {results.length > 0 && (
        <div className="rap-results">
          {results.map((t) => (
            <button key={t.id} className="rap-opt" disabled={picked(t)} onClick={() => add(t)}>
              <span className="rap-opt-name">{t.display_name}</span>
              <span className="rap-opt-hint">{[t.subfield?.display_name, t.field?.display_name].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}

      {/* Nəticə yoxdursa — sərbəst əlavə */}
      {q.trim().length >= 2 && !loading && results.length === 0 && (
        <button className="rap-custom" onClick={addCustom}>
          «{q.trim()}» sahəsini sərbəst əlavə et
        </button>
      )}

      {/* Əlaqəli təkliflər (birinci seçimdən sonra) */}
      {related.length > 0 && (
        <div className="rap-block">
          <div className="rap-label">Əlaqəli sahələr — bunlar da uyğun ola bilər:</div>
          <div className="rap-chips">
            {related.filter((t) => !picked(t)).slice(0, 8).map((t) => (
              <button key={t.id} className="rap-chip sug" onClick={() => add(t)}>+ {t.display_name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Başlanğıc — sahə üzrə göz at */}
      {results.length === 0 && related.length === 0 && q.length < 2 && (
        <div className="rap-block">
          <div className="rap-label">Və ya sahə üzrə göz atın:</div>
          <div className="rap-chips">
            {FIELDS.map((f) => (
              <button key={f.id} className={"rap-chip field" + (activeField === f.id ? " on" : "")} onClick={() => loadField(f.id)}>{f.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
