"use client";

import { useState } from "react";
import { WORLD_PATHS, MAP_W, MAP_H } from "./worldPaths";

export type CoCountry = { code: string; name: string; count: number };

// Ölkə mərkəzləri (lon, lat)
const CENTROIDS: Record<string, [number, number]> = {
  AZ: [47.6, 40.1], TR: [35.2, 39.0], RU: [90, 61], IR: [53, 32], UA: [32, 49], GE: [43.4, 42.2],
  KZ: [67, 48], US: [-98, 39], GB: [-2, 54], DE: [10, 51], FR: [2, 46], IT: [12, 42], ES: [-4, 40],
  PL: [19, 52], CN: [105, 35], IN: [79, 22], JP: [138, 36], KR: [128, 36], CA: [-106, 56], BR: [-53, -10],
  AU: [134, -25], NL: [5.5, 52], BE: [4.5, 50.6], CH: [8, 47], AT: [14, 47.5], SE: [15, 62], NO: [10, 62],
  FI: [26, 64], DK: [10, 56], CZ: [15.5, 49.8], SK: [19.5, 48.7], RO: [25, 46], BG: [25, 43], GR: [22, 39],
  PT: [-8, 39.5], IE: [-8, 53], HU: [19, 47], RS: [21, 44], HR: [15.5, 45.1], SI: [14.8, 46.1], LT: [24, 55.2],
  LV: [25, 57], EE: [26, 59], BY: [28, 53.7], MD: [28.5, 47], AE: [54, 24], SA: [45, 24], EG: [30, 27],
  IL: [35, 31.5], QA: [51.2, 25.3], KW: [47.7, 29.3], PK: [70, 30], BD: [90, 24], ID: [113, -0.8],
  MY: [102, 4], TH: [101, 15], VN: [106, 16], PH: [122, 13], SG: [103.8, 1.35], ZA: [24, -29], NG: [8, 10],
  MX: [-102, 23], AR: [-64, -34], CL: [-71, -30], NZ: [174, -41], UZ: [64, 41], TM: [59, 39], KG: [75, 41],
  TJ: [71, 39], MA: [-6, 32], DZ: [3, 28], TN: [9, 34], CY: [33, 35], MT: [14.4, 35.9], LU: [6.1, 49.8],
  JO: [36, 31], LB: [35.8, 33.9], IQ: [44, 33], SY: [38, 35],
};

const projX = (lon: number) => ((lon + 180) / 360) * MAP_W;
const projY = (lat: number) => ((90 - lat) / 180) * MAP_H;

type Hover = { code: string; name: string; count: number; x: number; y: number } | null;

export default function WorldMap({ countries }: { countries: CoCountry[] }) {
  const [hover, setHover] = useState<Hover>(null);
  const max = countries[0]?.count || 1;
  const markers = countries.filter((c) => CENTROIDS[c.code]);

  return (
    <div className="wm-wrap">
      <div className="wm-map" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Beynəlxalq əməkdaşlıq xəritəsi">
          <g>
            {WORLD_PATHS.map((d, i) => (
              <path key={i} d={d} fill="#e6edf3" stroke="#fff" strokeWidth={0.5} />
            ))}
          </g>
          <g>
            {markers.map((c) => {
              const [lon, lat] = CENTROIDS[c.code];
              const cx = projX(lon), cy = projY(lat);
              const active = hover?.code === c.code;
              const r = (3 + Math.sqrt(c.count / max) * 14) * (active ? 1.25 : 1);
              return (
                <g
                  key={c.code}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover({ code: c.code, name: c.name, count: c.count, x: (cx / MAP_W) * 100, y: (cy / MAP_H) * 100 })}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle cx={cx} cy={cy} r={r + 4} fill="#E8B14C" fillOpacity={active ? 0.3 : 0.18} />
                  <circle cx={cx} cy={cy} r={r} fill="#E8B14C" fillOpacity={active ? 1 : 0.85} stroke="#b8860f" strokeWidth={active ? 1.4 : 0.8} />
                </g>
              );
            })}
          </g>
        </svg>
        {hover && (
          <div className="wm-tip" style={{ left: `${hover.x}%`, top: `${hover.y}%` }}>
            <b>{hover.name}</b>
            <span>{hover.count} nəşr</span>
          </div>
        )}
      </div>

      {countries.length > 0 ? (
        <div className="cc-list">
          {countries.slice(0, 12).map((c) => (
            <div
              className={"cc-row" + (hover?.code === c.code ? " active" : "")}
              key={c.code}
              onMouseEnter={() => CENTROIDS[c.code] && setHover({ code: c.code, name: c.name, count: c.count, x: (projX(CENTROIDS[c.code][0]) / MAP_W) * 100, y: (projY(CENTROIDS[c.code][1]) / MAP_H) * 100 })}
              onMouseLeave={() => setHover(null)}
            >
              <span className="cc-name">{c.name}</span>
              <span className="cc-bar"><span style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }} /></span>
              <span className="cc-num">{c.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="cc-empty">OpenAlex məlumatlarında hələlik beynəlxalq həmmüəllif ölkəsi tapılmadı.</div>
      )}
    </div>
  );
}
