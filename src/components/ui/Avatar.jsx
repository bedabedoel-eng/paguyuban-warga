import { inisial } from '../../lib/format';
import StorageImage from './StorageImage';

const WARNA = ['#127a55', '#1d5fa8', '#8a6413', '#6a3dbd', '#a8460b', '#0e7490', '#9d174d', '#3f5f2a'];
export function warnaNama(nama = '') {
  let h = 0;
  for (const c of nama) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WARNA[h % WARNA.length];
}

/** Foto profil dari storage, atau inisial berwarna. */
export default function Avatar({ nama = '', path, src, size = 40, ring, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  const fallback = <span className="initials" style={{ background: warnaNama(nama) }}>{inisial(nama)}</span>;
  return (
    <span className={`avatar ${ring ? 'ring' : ''} ${className}`} style={style} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : path ? <StorageImage bucket="konten" path={path} alt="" fallback={fallback} /> : fallback}
    </span>
  );
}
