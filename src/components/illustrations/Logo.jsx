/** Logo Paguyuban Vila Gading Royal (berkas public/logo-vgr.png, latar transparan). */
export default function Logo({ size = 40, title = 'Logo Paguyuban Vila Gading Royal', tile }) {
  const img = (
    <img src="/logo-vgr.png" alt={title} width={tile ? Math.round(size * 0.82) : size} height={tile ? Math.round(size * 0.82) : size}
      style={{ display: 'block', objectFit: 'contain' }} draggable="false" />
  );
  if (!tile) return img;
  return (
    <span style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: '#fff', display: 'inline-grid', placeItems: 'center', flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      {img}
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
