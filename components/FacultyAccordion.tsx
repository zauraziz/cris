"use client";

import { useState } from "react";

export type KafedraStat = { name: string; count: number; works: number };
export type FacultyStat = { name: string; count: number; works: number; kafedras: KafedraStat[] };

export default function FacultyAccordion({ faculties }: { faculties: FacultyStat[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div>
      {faculties.map((fac, i) => {
        const maxKaf = Math.max(1, ...fac.kafedras.map((k) => k.works));
        const isOpen = !!open[i];
        return (
          <div className="fac-block" key={fac.name}>
            <div className="fac-bar">
              <div className="fac-top" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
                <div className="fl">
                  <div className="fnum">{i + 1}</div>
                  <div>
                    <div className="fname">{fac.name}</div>
                    <div className="fmeta">{fac.kafedras.length} kafedra</div>
                  </div>
                </div>
                <div className="fac-stats">
                  <div className="fac-stat"><div className="n">{fac.count}</div><div className="l">tədqiqatçı</div></div>
                  <div className="fac-stat"><div className="n">{fac.works}</div><div className="l">publikasiya</div></div>
                  <svg className={"fac-chev" + (isOpen ? " open" : "")} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
              {isOpen && (
                <div className="kaf-list">
                  {fac.count === 0 && <div className="empty-kaf">Bu fakültədə hələ qeydiyyatlı tədqiqatçı yoxdur</div>}
                  {fac.kafedras.map((kaf) => {
                    const pct = kaf.count ? Math.round((kaf.works / maxKaf) * 100) : 0;
                    return (
                      <div className="kaf-row" key={kaf.name}>
                        <div className="kn2">{kaf.name}</div>
                        <div className="kaf-bar-wrap">
                          <div className="kaf-track"><div className="kaf-fill" style={{ width: pct + "%" }} /></div>
                          <div className="kaf-val">{kaf.works} pub · {kaf.count} nəfər</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
