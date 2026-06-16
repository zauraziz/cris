"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const LANGS: { code: string; name: string; short: string }[] = [
  { code: "az", name: "Azərbaycanca", short: "AZ" },
  { code: "en", name: "English", short: "EN" },
  { code: "ru", name: "Русский", short: "RU" },
  { code: "tr", name: "Türkçe", short: "TR" },
];

export default function LanguageSwitcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const active = LANGS.find((l) => l.code === current) || LANGS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(code: string) {
    document.cookie = `locale=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="lang-sw" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((v) => !v)} aria-label="Dil / Language" title="Dil / Language">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20a15 15 0 010-20" />
        </svg>
        <span className="lang-cur">{active.short}</span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="lang-menu">
          {LANGS.map((l) => (
            <button key={l.code} className={"lang-item" + (l.code === current ? " active" : "")} onClick={() => choose(l.code)}>
              <span className="lang-short">{l.short}</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
