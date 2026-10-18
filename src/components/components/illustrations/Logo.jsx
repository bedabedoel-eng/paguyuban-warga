import { useId } from 'react';

/** Logo Paguyuban: rumah emas berisi tiga sosok warga. */
export default function Logo({ size = 64, title = 'Logo Paguyuban Warga' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D57A" />
          <stop offset=".55" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#A9821F" />
        </linearGradient>
      </defs>
      <path
        d="M32 4.5 5.5 25.2c-1 .8-1.5 1.9-1.5 3.1V56c0 2.2 1.8 4 4 4h48c2.2 0 4-1.8 4-4V28.3c0-1.2-.6-2.3-1.5-3.1L32 4.5Z"
        fill="none" stroke={`url(#g${id})`} strokeWidth="4" strokeLinejoin="round"
      />
      <path
        d="M32 13.5 13 28.6V52h38V28.6L32 13.5Z"
        fill={`url(#g${id})`} opacity=".18"
      />
      <path d="M32 13.5 13 28.6V52h38V28.6L32 13.5Z" fill="none" stroke={`url(#g${id})`} strokeWidth="2.4" strokeLinejoin="round" />
      <g fill={`url(#g${id})`}>
        <circle cx="32" cy="27.5" r="4.2" />
        <path d="M25.5 47.5V39c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5v8.5h-13Z" />
        <circle cx="22" cy="31.5" r="3.3" />
        <path d="M17 47.5v-6.2c0-2.9 2.2-5.2 5-5.2 1.3 0 2.4.4 3.3 1.2-.5 1.1-.8 2.3-.8 3.6v6.6H17Z" />
        <circle cx="42" cy="31.5" r="3.3" />
        <path d="M47 47.5v-6.2c0-2.9-2.2-5.2-5-5.2-1.3 0-2.4.4-3.3 1.2.5 1.1.8 2.3.8 3.6v6.6H47Z" />
      </g>
    </svg>
  );
}
