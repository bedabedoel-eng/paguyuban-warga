import { useId } from 'react';

/**
 * Ilustrasi perumahan asri dengan gelombang emas.
 * variant: 'dark' (di atas latar hijau tua), 'light' (pudar di latar putih), 'day' (siang, langit cerah)
 */
export default function HouseScene({ variant = 'dark', className = '', wave = true, style }) {
  const id = useId().replace(/:/g, '');
  const day = variant === 'day';
  const light = variant === 'light';
  const op = light ? 0.55 : 1;
  const wall = day ? '#f7f1e3' : light ? '#eef2ee' : '#e9e2cf';
  const wall2 = day ? '#efe4cc' : light ? '#e3e9e4' : '#d9cfb6';
  const roof = day ? '#2f5d4c' : light ? '#9db8aa' : '#163f31';
  const roof2 = day ? '#3b4a46' : light ? '#b4c7bd' : '#21352f';
  const win = day ? '#ffe9a8' : light ? '#f6efd6' : '#f6d27a';
  const tree1 = day ? '#2f8a4f' : light ? '#b9d5c3' : '#1f6b47';
  const tree2 = day ? '#46a35f' : light ? '#cfe3d5' : '#2a7d52';
  const hill = day ? '#7cc08a' : light ? '#e4efe7' : '#0f5a40';
  const grass = day ? '#5aae6b' : light ? '#d7e9dc' : '#0d4e38';

  const House = ({ x, y, w, h, r = roof, big }) => (
    <g transform={`translate(${x} ${y})`}>
      <rect x={4} y={h * 0.38} width={w - 8} height={h * 0.62} fill={wall} />
      <rect x={w - 8 - (w - 8) * 0.28 + 4} y={h * 0.38} width={(w - 8) * 0.28} height={h * 0.62} fill={wall2} />
      <polygon points={`0,${h * 0.42} ${w / 2},0 ${w},${h * 0.42}`} fill={r} />
      <rect x={w * 0.18} y={h * 0.55} width={w * 0.18} height={h * 0.16} rx="1.5" fill={win} />
      <rect x={w * 0.6} y={h * 0.55} width={w * 0.18} height={h * 0.16} rx="1.5" fill={win} />
      <rect x={w * 0.42} y={h * 0.66} width={w * 0.16} height={h * 0.34} rx="1.5" fill={r} opacity=".85" />
      {big && <rect x={w * 0.42} y={h * 0.2} width={w * 0.16} height={h * 0.12} rx="1" fill={win} />}
    </g>
  );
  const Tree = ({ x, y, s = 1, c = tree1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.6" y="0" width="3.2" height="12" fill={day ? '#6b4f2e' : light ? '#c9d6cd' : '#173b2c'} />
      <circle cx="0" cy="-4" r="9" fill={c} />
      <circle cx="-6" cy="1" r="6" fill={c} />
      <circle cx="6" cy="1" r="6.5" fill={c} />
    </g>
  );

  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" className={className} style={{ width: '100%', height: '100%', ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5dc8a" />
          <stop offset=".5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#b8932a" />
        </linearGradient>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3f5" />
          <stop offset="1" stopColor="#eef8fb" />
        </linearGradient>
        <linearGradient id={`deep${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={day ? '#3f9a58' : light ? '#d2e6d8' : '#0b5a42'} />
          <stop offset="1" stopColor={day ? '#2c7a45' : light ? '#c4dfcc' : '#073f2e'} />
        </linearGradient>
      </defs>
      {day && <rect width="400" height="220" fill={`url(#sky${id})`} />}
      <g opacity={op}>
        <path d="M0 130 C 60 100, 120 112, 180 104 S 300 92, 400 112 V220 H0Z" fill={hill} opacity={day ? 0.6 : 0.55} />
        <Tree x={22} y={118} s={1.25} c={tree2} />
        <Tree x={378} y={112} s={1.35} c={tree2} />
        <House x={40} y={86} w={64} h={56} r={roof2} />
        <House x={98} y={70} w={86} h={74} big />
        <Tree x={192} y={122} s={1.1} />
        <House x={204} y={78} w={78} h={66} r={roof2} big />
        <House x={278} y={90} w={62} h={54} />
        <Tree x={348} y={128} s={0.95} />
        <Tree x={88} y={136} s={0.8} c={tree2} />
        <path d="M0 146 C 80 136, 160 150, 240 142 S 360 136, 400 142 V220 H0Z" fill={grass} />
      </g>
      {wave && (
        <>
          <path d="M0 176 C 90 150, 190 196, 280 168 S 380 150, 400 156 V220 H0Z" fill={`url(#deep${id})`} />
          <path d="M0 172 C 90 146, 190 192, 280 164 S 380 146, 400 152 L400 162 C 380 156, 340 158, 282 176 S 90 160, 0 184Z" fill={`url(#gold${id})`} opacity={light ? 0.7 : 1} />
        </>
      )}
    </svg>
  );
}
