"use client";

import React, { Component } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type CoCountry = { code: string; name: string; count: number };

// Ölkə mərkəzləri (lon, lat) — xəritədə nöqtə yerləşdirmək üçün
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
};

class MapBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

function CountryList({ items }: { items: CoCountry[] }) {
  const max = items[0]?.count || 1;
  return (
    <div className="cc-list">
      {items.slice(0, 12).map((c) => (
        <div className="cc-row" key={c.code}>
          <span className="cc-name">{c.name}</span>
          <span className="cc-bar"><span style={{ width: `${Math.max(6, (c.count / max) * 100)}%` }} /></span>
          <span className="cc-num">{c.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function WorldMap({ countries }: { countries: CoCountry[] }) {
  const max = countries[0]?.count || 1;
  const markers = countries.filter((c) => CENTROIDS[c.code]);

  const mapEl = (
    <div className="wm-map">
      <ComposableMap projectionConfig={{ scale: 145 }} width={900} height={420} style={{ width: "100%", height: "auto" }}>
        <Geographies geography={GEO_URL}>
          {({ geographies }: any) =>
            geographies.map((geo: any) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e7eef4"
                stroke="#fff"
                strokeWidth={0.4}
                style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#dbe7f0" }, pressed: { outline: "none" } }}
              />
            ))
          }
        </Geographies>
        {markers.map((c) => {
          const r = 3 + Math.sqrt(c.count / max) * 13;
          return (
            <Marker key={c.code} coordinates={CENTROIDS[c.code]}>
              <circle r={r} fill="#E8B14C" fillOpacity={0.75} stroke="#b8860f" strokeWidth={0.6} />
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );

  return (
    <div className="wm-wrap">
      <MapBoundary fallback={null}>{mapEl}</MapBoundary>
      <CountryList items={countries} />
    </div>
  );
}
