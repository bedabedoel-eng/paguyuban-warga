import { useState } from 'react';
import { BULAN_PENDEK, BULAN, rupiah } from '../../lib/format';

/** Grafik batang bertumpuk/berpasangan 12 bulan. mode: 'ipl' | 'kas' */
export default function BarChart12({ data = [], mode = 'ipl' }) {
  const [hover, setHover] = useState(null);
  const kas = mode === 'kas';
  const rows = Array.from({ length: 12 }, (_, i) => {
    const d = data.find((x) => Number(x.bulan) === i + 1) || {};
    return kas
      ? { a: Number(d.pemasukan || 0), b: Number(d.pengeluaran || 0) }
      : { a: Number(d.lunas || 0), b: Number(d.belum || 0) };
  });
  const maxRaw = Math.max(...rows.map((r) => (kas ? Math.max(r.a, r.b) : r.a + r.b)), 0);
  const nice = (v) => { if (v <= 4) return 4; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  const max = nice(maxRaw || 1);
  const W = 720; const H = 220; const L = kas ? 52 : 28; const B = 24; const T = 10;
  const ih = H - B - T; const bw = (W - L) / 12;
  const y = (v) => T + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const fmt = (v) => (kas ? (v >= 1e6 ? `${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : v >= 1e3 ? `${Math.round(v / 1e3)} rb` : v) : v);
  const cA = kas ? 'var(--daun-600)' : 'var(--daun-600)';
  const cB = kas ? 'var(--kunyit-500)' : 'var(--line-strong)';
  return (
    <div className="chart">
      <div className="chart-legend" style={{ marginBottom: 8 }}>
        <span><i style={{ background: cA }} />{kas ? 'Pemasukan' : 'Lunas'}</span>
        <span><i style={{ background: cB }} />{kas ? 'Pengeluaran' : 'Belum lunas'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={kas ? 'Grafik arus kas per bulan' : 'Grafik pembayaran IPL per bulan'}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={L - 8} y={y(t) + 4} fontSize="11" textAnchor="end" fill="var(--ink-3)">{fmt(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = L + i * bw + bw / 2;
          const on = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={L + i * bw} y={T} width={bw} height={ih} fill={on ? 'var(--surface-2)' : 'transparent'} />
              {kas ? (
                <>
                  {r.a > 0 && <rect x={cx - bw * 0.3} y={y(r.a)} width={bw * 0.28} height={T + ih - y(r.a)} rx="3" fill={cA} />}
                  {r.b > 0 && <rect x={cx + bw * 0.02} y={y(r.b)} width={bw * 0.28} height={T + ih - y(r.b)} rx="3" fill={cB} />}
                </>
              ) : (
                <>
                  {r.b > 0 && <rect x={cx - bw * 0.22} y={y(r.a + r.b)} width={bw * 0.44} height={y(r.a) - y(r.a + r.b)} rx="3" fill={cB} />}
                  {r.a > 0 && <rect x={cx - bw * 0.22} y={y(r.a)} width={bw * 0.44} height={T + ih - y(r.a)} rx="3" fill={cA} />}
                </>
              )}
              <text x={cx} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--ink-3)">{BULAN_PENDEK[i]}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%` }}>
          <b>{BULAN[hover]}</b><br />
          {kas ? <>Masuk {rupiah(rows[hover].a)}<br />Keluar {rupiah(rows[hover].b)}</> : <>Lunas {rows[hover].a} rumah<br />Belum {rows[hover].b} rumah</>}
        </div>
      )}
    </div>
  );
}
