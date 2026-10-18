import { Camera } from 'lucide-react';
import { inisial } from '../../lib/format';
import StorageImage from './StorageImage';
import { warnaNama } from './Avatar';

/**
 * Foto warga rasio 3:4. Tanpa foto, tampil blok warna dengan inisial.
 * Ukuran mengikuti lebar induknya (atau className).
 */
export default function FotoWarga({ nama = '', path, className = '', children, ...rest }) {
  const warna = warnaNama(nama);
  const fallback = (
    <span className="foto-kosong" style={{ background: `linear-gradient(160deg, ${warna}, color-mix(in srgb, ${warna} 55%, #0a2219))` }}>
      <b>{inisial(nama)}</b>
      <Camera size={14} aria-hidden="true" />
    </span>
  );
  return (
    <span className={`foto34 ${className}`} {...rest}>
      {path ? <StorageImage bucket="konten" path={path} alt={`Foto ${nama}`} fallback={fallback} /> : fallback}
      {children}
    </span>
  );
}
