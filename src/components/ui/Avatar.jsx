import { inisial } from '../../lib/format';
import StorageImage from './StorageImage';

const WARNA = ['#0b6b4f', '#2e7d32', '#b8932a', '#2563eb', '#7c3aed', '#c2410c', '#0e7490', '#be185d'];
function warna(nama = '') {
  let h = 0;
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WARNA[h % WARNA.length];
}

/** Foto potret rasio 3:4 (lebar penuh induk) dari storage, atau inisial berwarna bila belum ada foto. */
export function FotoPotret({ nama = '', path, src, className = '' }) {
  const fallback = (
    <span className="foto34-fallback" style={{ background: warna(nama) }}>{inisial(nama)}</span>
  );
  return (
    <span className={`foto34 ${className}`} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : path ? <StorageImage bucket="konten" path={path} alt="" fallback={fallback} /> : fallback}
    </span>
  );
}

/** Foto profil dari storage, atau inisial berwarna. */
export default function Avatar({ nama = '', path, src, size = 40, ring, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };
  const fallback = (
    <span style={{ color: '#fff', background: warna(nama), width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      {inisial(nama)}
    </span>
  );
  return (
    <span className={`avatar ${ring ? 'ring' : ''} ${className}`} style={style} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : path ? <StorageImage bucket="konten" path={path} alt="" fallback={fallback} /> : fallback}
    </span>
  );
}
