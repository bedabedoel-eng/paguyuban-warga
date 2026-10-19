import { useEffect, useState } from 'react';
import { signedUrl } from '../../lib/storage';

/** Gambar dari Supabase Storage (privat via signed URL). */
export default function StorageImage({ bucket = 'konten', path, alt = '', fallback = null, className, style }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    setUrl(null);
    if (path) signedUrl(bucket, path).then((u) => { if (alive) { if (u) setUrl(u); else setFailed(true); } });
    return () => { alive = false; };
  }, [bucket, path]);
  if (!path || failed) return fallback;
  if (!url) return fallback || <span className="skeleton" style={{ display: 'block', width: '100%', height: '100%' }} />;
  return <img src={url} alt={alt} className={className} style={style} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
