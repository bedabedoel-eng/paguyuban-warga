import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Splash from '../features/auth/Splash';
import { ErrorState } from '../components/ui';

/** Hanya untuk pengguna yang sudah masuk dan berstatus aktif. */
export function RequireAktif() {
  const { session, warga, kontak, loading, profilError, refreshProfil } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/masuk" replace state={{ from: loc.pathname }} />;
  if (profilError) return <div style={{ padding: 24 }}><ErrorState error={String(profilError.message || profilError)} onRetry={refreshProfil} /></div>;
  if (!warga) return <Splash />;
  if (warga.status === 'menunggu' && (!kontak?.nomor_hp || !warga.blok || !warga.no_rumah)) return <Navigate to="/lengkapi" replace />;
  if (warga.status !== 'aktif') return <Navigate to="/menunggu" replace />;
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

/** Batasi halaman berdasarkan hak (pengurus | admin | bendahara). */
export function RequireHak({ hak: perlu }) {
  const { hak } = useAuth();
  if (!hak[perlu]) return <Navigate to="/" replace />;
  return <Outlet />;
}
