import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider, Loader } from './components/ui';
import { isConfigured } from './lib/supabase';
import AppShell from './components/layout/AppShell';
import { RequireAktif, GuestOnly, RequireLogin, RequireHak } from './routes/guards';
import Login from './features/auth/Login';
import Daftar from './features/auth/Daftar';
import Menunggu from './features/auth/Menunggu';
import LengkapiData from './features/auth/LengkapiData';
import GantiPin from './features/auth/GantiPin';
import BelumDikonfigurasi from './features/auth/BelumDikonfigurasi';
import Beranda from './features/beranda/Beranda';

const Direktori = lazy(() => import('./features/warga/Direktori'));
const DetailWarga = lazy(() => import('./features/warga/DetailWarga'));
const TagihanIpl = lazy(() => import('./features/ipl/TagihanIpl'));
const BayarIpl = lazy(() => import('./features/ipl/BayarIpl'));
const RiwayatIpl = lazy(() => import('./features/ipl/RiwayatIpl'));
const Pengumuman = lazy(() => import('./features/pengumuman/Pengumuman'));
const DetailPengumuman = lazy(() => import('./features/pengumuman/DetailPengumuman'));
const FormPengumuman = lazy(() => import('./features/pengumuman/FormPengumuman'));
const Kegiatan = lazy(() => import('./features/kegiatan/Kegiatan'));
const DetailKegiatan = lazy(() => import('./features/kegiatan/DetailKegiatan'));
const FormKegiatan = lazy(() => import('./features/kegiatan/FormKegiatan'));
const Aspirasi = lazy(() => import('./features/laporan/Aspirasi'));
const Keuangan = lazy(() => import('./features/keuangan/Keuangan'));
const Pengurus = lazy(() => import('./features/pengurus/Pengurus'));
const KelolaPengurus = lazy(() => import('./features/pengurus/KelolaPengurus'));
const Administrasi = lazy(() => import('./features/administrasi/Administrasi'));
const DetailDokumen = lazy(() => import('./features/administrasi/DetailDokumen'));
const FormDokumen = lazy(() => import('./features/administrasi/FormDokumen'));
const ProfilSaya = lazy(() => import('./features/profil/ProfilSaya'));
const UbahProfil = lazy(() => import('./features/profil/UbahProfil'));
const Pengaturan = lazy(() => import('./features/pengaturan/Pengaturan'));
const Privasi = lazy(() => import('./features/pengaturan/Privasi'));
const PrefNotifikasi = lazy(() => import('./features/pengaturan/PrefNotifikasi'));
const Keamanan = lazy(() => import('./features/pengaturan/Keamanan'));
const Tentang = lazy(() => import('./features/pengaturan/Tentang'));
const Menu = lazy(() => import('./features/menu/Menu'));
const KontakDarurat = lazy(() => import('./features/menu/KontakDarurat'));
const Notifikasi = lazy(() => import('./features/notifikasi/Notifikasi'));
const DashboardAdmin = lazy(() => import('./features/admin/DashboardAdmin'));
const VerifikasiAnggota = lazy(() => import('./features/admin/VerifikasiAnggota'));
const DataWarga = lazy(() => import('./features/admin/DataWarga'));
const WilayahGang = lazy(() => import('./features/admin/WilayahGang'));
const DataRumah = lazy(() => import('./features/admin/DataRumah'));
const KelolaIpl = lazy(() => import('./features/admin/KelolaIpl'));
const KelolaLaporan = lazy(() => import('./features/admin/KelolaLaporan'));
const ImportWarga = lazy(() => import('./features/admin/ImportWarga'));
const PengaturanPaguyuban = lazy(() => import('./features/admin/PengaturanPaguyuban'));

export default function App() {
  if (!isConfigured) return <BelumDikonfigurasi />;
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <ConfirmProvider>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/masuk" element={<Login />} />
                  <Route path="/daftar" element={<Daftar />} />
                  <Route path="/admin/masuk" element={<Login mode="admin" />} />
                </Route>
                <Route element={<RequireLogin />}>
                  <Route path="/menunggu" element={<Menunggu />} />
                  <Route path="/lengkapi" element={<LengkapiData />} />
                  <Route path="/ganti-pin" element={<GantiPin />} />
                </Route>
                <Route element={<RequireAktif />}>
                  <Route element={<AppShell />}>
                    <Route index element={<Beranda />} />
                    <Route path="warga" element={<Direktori />} />
                    <Route path="warga/:id" element={<DetailWarga />} />
                    <Route path="ipl" element={<TagihanIpl />} />
                    <Route path="ipl/bayar" element={<BayarIpl />} />
                    <Route path="ipl/riwayat" element={<RiwayatIpl />} />
                    <Route path="pengumuman" element={<Pengumuman />} />
                    <Route path="pengumuman/:id" element={<DetailPengumuman />} />
                    <Route path="kegiatan" element={<Kegiatan />} />
                    <Route path="kegiatan/:id" element={<DetailKegiatan />} />
                    <Route path="aspirasi" element={<Aspirasi />} />
                    <Route path="keuangan" element={<Keuangan />} />
                    <Route path="keuangan/:tab" element={<Keuangan />} />
                    <Route path="pengurus" element={<Pengurus />} />
                    <Route path="administrasi" element={<Administrasi />} />
                    <Route path="administrasi/:id" element={<DetailDokumen />} />
                    <Route path="profil" element={<ProfilSaya />} />
                    <Route path="profil/ubah" element={<UbahProfil />} />
                    <Route path="pengaturan" element={<Pengaturan />} />
                    <Route path="pengaturan/akun" element={<Navigate to="/profil" replace />} />
                    <Route path="pengaturan/privasi" element={<Privasi />} />
                    <Route path="pengaturan/notifikasi" element={<PrefNotifikasi />} />
                    <Route path="pengaturan/keamanan" element={<Keamanan />} />
                    <Route path="pengaturan/bahasa" element={<Navigate to="/pengaturan" replace />} />
                    <Route path="pengaturan/tentang" element={<Tentang />} />
                    <Route path="menu" element={<Menu />} />
                    <Route path="kontak-darurat" element={<KontakDarurat />} />
                    <Route path="notifikasi" element={<Notifikasi />} />

                    <Route element={<RequireHak hak="pengurus" />}>
                      <Route path="admin" element={<DashboardAdmin />} />
                    </Route>
                    <Route element={<RequireHak hak={['kelola_anggota', 'humas']} />}>
                      <Route path="admin/verifikasi" element={<VerifikasiAnggota />} />
                      <Route path="admin/warga" element={<DataWarga />} />
                    </Route>
                    <Route element={<RequireHak hak="kelola_anggota" />}>
                      <Route path="admin/wilayah" element={<WilayahGang />} />
                    </Route>
                    <Route element={<RequireHak hak="kelola_laporan" />}>
                      <Route path="admin/laporan" element={<KelolaLaporan />} />
                    </Route>
                    <Route element={<RequireHak hak="kelola_info" />}>
                      <Route path="pengumuman/baru" element={<FormPengumuman />} />
                      <Route path="pengumuman/:id/ubah" element={<FormPengumuman />} />
                      <Route path="kegiatan/baru" element={<FormKegiatan />} />
                      <Route path="kegiatan/:id/ubah" element={<FormKegiatan />} />
                    </Route>
                    <Route element={<RequireHak hak="kelola_dokumen" />}>
                      <Route path="administrasi/baru" element={<FormDokumen />} />
                      <Route path="administrasi/:id/ubah" element={<FormDokumen />} />
                    </Route>
                    <Route element={<RequireHak hak="kelola_pengurus" />}>
                      <Route path="pengurus/kelola" element={<KelolaPengurus />} />
                    </Route>
                    <Route element={<RequireHak hak="bendahara" />}>
                      <Route path="admin/ipl" element={<KelolaIpl />} />
                      <Route path="admin/rumah" element={<DataRumah />} />
                    </Route>
                    <Route element={<RequireHak hak="admin" />}>
                      <Route path="admin/pengaturan" element={<PengaturanPaguyuban />} />
                      <Route path="admin/import" element={<ImportWarga />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </ConfirmProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
