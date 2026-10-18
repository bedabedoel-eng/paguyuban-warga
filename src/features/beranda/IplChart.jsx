import { useState } from 'react';
import { BULAN_PENDEK, BULAN } from '../../lib/format';

/** Grafik batang bertumpuk: lunas (hijau) + belum bayar (abu). */
export default function IplChart({ data = [] }) {
  const [hover, setHover] = useState(null);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const d = data.find((x) => x.bulan === i + 1) || {};
    return { bulan: i + 1, lunas: Number(d.lunas || 0), belum: Number(d.belum || 0) };
  });
  const maxRaw = Math.max(...rows.map((r) => r.lunas + r.belum), 0);
  const step = maxRaw <= 4 ? 1 : maxRaw <= 20 ? 5 : maxRaw <= 100 ? 25 : Math.ceil(maxRaw / 4 / 50) * 50;
  const max = Math.max(step * 4, Math.ceil(maxRaw / step) * step);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const W = 900; const H = 240; const L = 32; const B = 22; const T = 8;
  const ih = H - B - T; const bw = (W - L) / 12;
  const y = (v) => T + ih - (v / max) * ih;
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Grafik pembayaran IPL per bulan">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="#edf0f3" />
            <text x={L - 8} y={y(t) + 4} fontSize="12" textAnchor="end" fill="#8a94a3">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = L + i * bw + bw * 0.3;
          const w = bw * 0.4;
          const yl = y(r.lunas);
          const yb = y(r.lunas + r.belum);
          return (
            <g key={r.bulan} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect x={L + i * bw} y={T} width={bw} height={ih} fill="transparent" />
              {r.belum > 0 && <rect x={x} y={yb} width={w} height={Math.max(0, yl - yb)} rx="3" fill="#d6dbe1" />}
              {r.lunas > 0 && <rect x={x} y={yl} width={w} height={T + ih - yl} rx="3" fill={hover === i ? '#0e8a63' : '#0b6b4f'} />}
              <text x={L + i * bw + bw / 2} y={H - 6} fontSize="12" textAnchor="middle" fill="#6b7280">{BULAN_PENDEK[i]}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%` }}>
          <b>{BULAN[hover]}</b><br />Lunas: {rows[hover].lunas} KK<br />Belum: {rows[hover].belum} KK
        </div>
      )}
    </div>
  );
}
