import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoonStar } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { jadwalShalat } from '../../services/shalat';

const menitSekarang = (n) => n.getHours() * 60 + n.getMinutes();
function sisa(menit) {
  const j = Math.floor(menit / 60); const m = menit % 60;
  return j > 0 ? `${j} jam ${m} menit lagi` : `${m} menit lagi`;
}

/** Waktu shalat hari ini di bawah kartu salam. Perlu koordinat di Pengaturan paguyuban. */
export default function JadwalShalat({ lat, lon, admin }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const ada = lat != null && lon != null;
  const s = useAsync(() => jadwalShalat(lat, lon), [lat, lon], { enabled: ada });

  if (!ada) {
    return admin ? <p className="text-sm muted">Isi latitude dan longitude di <Link to="/admin/pengaturan" className="link">Pengaturan paguyuban</Link> untuk menampilkan jadwal shalat.</p> : null;
  }
  if (s.error || (!s.loading && !s.data)) return null;
  if (!s.data) return <div className="shalat" aria-busy="true"><div className="shalat-head"><MoonStar size={16} aria-hidden="true" /><b>Waktu shalat</b></div><div className="shalat-grid">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="shalat-item skel" />)}</div></div>;

  const m = menitSekarang(now);
  const idx = s.data.waktu.findIndex((w) => w.jam * 60 + w.menit > m);
  const berikut = idx >= 0 ? s.data.waktu[idx] : null;
  return (
    <section className="shalat" aria-label="Waktu shalat hari ini">
      <div className="shalat-head">
        <MoonStar size={16} aria-hidden="true" /><b>Waktu shalat</b>
        <span className="muted">{berikut ? `${berikut.label} ${sisa(berikut.jam * 60 + berikut.menit - m)}` : 'Subuh besok'}</span>
      </div>
      <div className="shalat-grid">
        {s.data.waktu.map((w, i) => (
          <div key={w.label} className={`shalat-item${i === idx ? ' next' : ''}`} aria-current={i === idx ? 'true' : undefined}>
            <span>{w.label}</span><b className="num">{w.teks}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
