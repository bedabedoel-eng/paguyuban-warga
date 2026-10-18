import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Splash from '../features/auth/Splash';
import { ErrorState, EmptyState, Button } from '../components/ui';

/** Hanya untuk pengguna yang sudah masuk dan berstatus aktif. */
export function RequireAktif() {
  const { session, warga, kontak, loading, profilError, refreshProfil } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/masuk" replace state={{ from: loc.pathname }} />;
  if (profilError) return <div className="page narrow"><ErrorState error={String(profilError.message || profilError)} onRetry={refreshProfil} /></div>;
  if (!warga) return <Splash />;
  if (warga.status === 'menunggu' && (!kontak?.nomor_hp || !warga.blok || !warga.no_rumah)) return <Navigate to="/lengkapi" replace />;
  if (warga.status !== 'aktif') return <Navigate to="/menunggu" replace />;
  if (warga.wajib_ganti_pin) return <Navigate to="/ganti-pin" replace />;
  return <Outlet />;
}

/** Halaman tamu (masuk/daftar): alihkan bila sudah masuk. */
export function GuestOnly() {
  const { session, loading, warga } = useAuth();
  if (loading) return <Splash />;
  if (session && warga) return <Navigate to={warga.status === 'aktif' ? '/' : '/menunggu'} replace />;
  return <Outlet />;
}

export function RequireLogin() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/masuk" replace />;
  return <Outlet />;
}

/**
 * Batasi halaman berdasarkan hak. hak: string atau array (cukup salah satu).
 * Pengguna tanpa hak melihat penjelasan, bukan dialihkan diam-diam.
 */
export function RequireHak({ hak: perlu }) {
  const { hak } = useAuth();
  const daftar = Array.isArray(perlu) ? perlu : [perlu];
  if (!daftar.some((k) => hak[k])) {
    return (
      <div className="page narrow">
        <div className="card">
          <EmptyState icon={ShieldAlert} title="Halaman ini khusus pengurus berwenang"
            text="Jabatan Anda tidak memiliki akses ke halaman ini. Bila seharusnya punya, minta Ketua mengatur jabatan Anda."
            action={<Button variant="secondary" to="/">Kembali ke beranda</Button>} />
        </div>
      </div>
    );
  }
  return <Outlet />;
}
