import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Clock, CircleX, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { formatHp } from '../../lib/phone';

/** Status akun yang belum aktif: menunggu persetujuan / ditolak / nonaktif. */
export default function Menunggu() {
  const { warga, kontak, refreshProfil, signOut, session } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!session) return <Navigate to="/masuk" replace />;
  if (warga?.status === 'aktif') return <Navigate to="/" replace />;
  const ditolak = warga?.status === 'ditolak';
  const nonaktif = warga?.status === 'nonaktif';
  return (
    <AuthLayout compactBrand>
      <div className="stack center" style={{ alignItems: 'center' }}>
        <span className={`icon-circle ${ditolak || nonaktif ? 'tone-red' : 'tone-gold'}`} style={{ width: 64, height: 64 }}>
          {ditolak || nonaktif ? <CircleX size={30} /> : <Clock size={30} />}
        </span>
        <h1 className="auth-title">{ditolak ? 'Pendaftaran Ditolak' : nonaktif ? 'Akun Dinonaktifkan' : 'Menunggu Persetujuan'}</h1>
        <p className="auth-sub">
          {ditolak
            ? 'Maaf, pendaftaran Anda belum dapat disetujui pengurus.'
            : nonaktif
              ? 'Akun Anda sedang dinonaktifkan. Hubungi pengurus paguyuban.'
              : 'Terima kasih telah mendaftar. Pengurus akan memeriksa data Anda. Silakan cek kembali nanti.'}
        </p>
        {warga?.alasan_status && <div className="alert warn" style={{ width: '100%', textAlign: 'left' }}>Alasan: {warga.alasan_status}</div>}
        <div className="card card-pad" style={{ width: '100%', textAlign: 'left' }}>
          <div className="kv"><span>Nama</span><span>{warga?.nama}</span></div>
          <div className="kv"><span>Nomor HP</span><span>{kontak?.nomor_hp ? formatHp(kontak.nomor_hp) : '-'}</span></div>
          <div className="kv"><span>Rumah</span><span>{warga?.blok ? `Blok ${warga.blok} No. ${warga.no_rumah}` : '-'}</span></div>
        </div>
        {!ditolak && !nonaktif && (
          <Button block variant="outline" icon={RefreshCw} loading={loading} onClick={async () => { setLoading(true); await refreshProfil(); setLoading(false); }}>
            Periksa status
          </Button>
        )}
        <Button block variant="ghost" onClick={signOut}>Keluar</Button>
      </div>
    </AuthLayout>
  );
}
