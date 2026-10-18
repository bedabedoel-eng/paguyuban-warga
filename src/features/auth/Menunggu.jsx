import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Clock, CircleX, RefreshCw, LogOut } from 'lucide-react';
import { Button, Callout } from '../../components/ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { formatHp } from '../../lib/phone';
import { useSettings } from '../../context/SettingsContext';

/** Status akun yang belum aktif: menunggu / ditolak / nonaktif. */
export default function Menunggu() {
  const { warga, kontak, refreshProfil, signOut, session } = useAuth();
  const { alamat, namaGang } = useSettings();
  const [loading, setLoading] = useState(false);
  if (!session) return <Navigate to="/masuk" replace />;
  if (warga?.status === 'aktif') return <Navigate to="/" replace />;
  const ditolak = warga?.status === 'ditolak';
  const nonaktif = warga?.status === 'nonaktif';
  const judul = ditolak ? 'Pendaftaran belum disetujui' : nonaktif ? 'Akun dinonaktifkan' : 'Menunggu verifikasi pengurus';
  const teks = ditolak
    ? 'Pengurus belum dapat menyetujui pendaftaran Anda. Hubungi humas gang atau sekretaris untuk informasi lebih lanjut.'
    : nonaktif
      ? 'Akun Anda sedang dinonaktifkan. Hubungi pengurus paguyuban.'
      : `Data Anda sudah dikirim ke ${namaGang(warga?.gang_id) ? `humas ${namaGang(warga.gang_id)}, ` : ''}sekretaris, dan pimpinan paguyuban. Biasanya diperiksa dalam 1–2 hari.`;
  return (
    <AuthLayout>
      <div className="status-hero">
        <span className={`ico ${ditolak || nonaktif ? 'bad' : 'gold'}`}>{ditolak || nonaktif ? <CircleX size={28} /> : <Clock size={28} />}</span>
        <h1 style={{ fontSize: 'var(--fs-2xl)' }}>{judul}</h1>
        <p className="ink-2">{teks}</p>
      </div>
      {warga?.alasan_status && <Callout tone="warn"><b>Catatan pengurus:</b> {warga.alasan_status}</Callout>}
      <div className="card pad">
        <dl className="kv" style={{ margin: 0 }}>
          <dt>Nama</dt><dd>{warga?.nama}</dd>
          <dt>Nomor HP</dt><dd className="num">{kontak?.nomor_hp ? formatHp(kontak.nomor_hp) : '-'}</dd>
          <dt>Rumah</dt><dd>{alamat(warga) || '-'}</dd>
        </dl>
      </div>
      <div className="stack-sm">
        {!ditolak && !nonaktif && (
          <Button block variant="secondary" icon={RefreshCw} loading={loading} onClick={async () => { setLoading(true); await refreshProfil(); setLoading(false); }}>Periksa status</Button>
        )}
        <Button block variant="ghost" icon={LogOut} onClick={signOut}>Keluar</Button>
      </div>
    </AuthLayout>
  );
}
