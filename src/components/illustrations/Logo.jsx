import { useId } from 'react';

/** Logo paguyuban: rumah emas berisi tiga sosok warga. */
export default function Logo({ size = 40, title = 'Logo paguyuban', tile }) {
  const id = useId().replace(/:/g, '');
  const svg = (
    <svg width={tile ? size * 0.72 : size} height={tile ? size * 0.72 : size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0D589" />
          <stop offset=".55" stopColor="#C99A2E" />
          <stop offset="1" stopColor="#9C7419" />
        </linearGradient>
      </defs>
      <path d="M32 5 6 25.6c-1 .8-1.6 2-1.6 3.2V55c0 2.3 1.9 4.2 4.2 4.2h46.8c2.3 0 4.2-1.9 4.2-4.2V28.8c0-1.2-.6-2.4-1.6-3.2L32 5Z" fill="none" stroke={`url(#g${id})`} strokeWidth="4.2" strokeLinejoin="round" />
      <g fill={`url(#g${id})`}>
        <circle cx="32" cy="27" r="4.4" />
        <path d="M25.2 48V39.4c0-3.8 3-6.8 6.8-6.8s6.8 3 6.8 6.8V48H25.2Z" />
        <circle cx="21.5" cy="31.2" r="3.4" />
        <path d="M16.2 48v-6.3c0-3 2.4-5.4 5.3-5.4 1.3 0 2.5.5 3.4 1.2-.5 1.2-.8 2.4-.8 3.8V48h-7.9Z" />
        <circle cx="42.5" cy="31.2" r="3.4" />
        <path d="M47.8 48v-6.3c0-3-2.4-5.4-5.3-5.4-1.3 0-2.5.5-3.4 1.2.5 1.2.8 2.4.8 3.8V48h7.9Z" />
      </g>
    </svg>
  );
  if (!tile) return svg;
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: '#0e2e23', display: 'inline-grid', placeItems: 'center', flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      {svg}
    </span>
  );
}

/** Motif garis atap berlapis (dipakai di panel salam & halaman masuk). */
export function Roofline({ className = 'roofline', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 600 220" fill="none" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${20 + i * 26} 220 L300 ${18 + i * 30} L${580 - i * 26} 220`} stroke="currentColor" strokeWidth={i === 0 ? 3 : 1.5} strokeLinejoin="round" opacity={1 - i * 0.22} />
      ))}
    </svg>
  );
}
