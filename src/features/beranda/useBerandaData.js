import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { statistik, statistikIplBulanan, aktivitasTerbaru, cuaca } from '../../services/dashboard';
import { tagihanRumah } from '../../services/ipl';
import { daftarPengumuman } from '../../services/pengumuman';
import { daftarKegiatan } from '../../services/kegiatan';
import { daftarNotifikasi } from '../../services/notifikasi';
import { daftarKontakDarurat } from '../../services/pengaturan';

/** Ringkas status IPL dari daftar tagihan rumah. */
export function ringkasIpl(tagihan = []) {
  const terbaru = tagihan[0] || null;
  const tahun = new Date().getFullYear();
  const tahunIni = tagihan.filter((t) => Number(t.periode.slice(0, 4)) === tahun);
  const belum = tagihan.filter((t) => t.status === 'belum_bayar');
  return {
    terbaru,
    lunasTahunIni: tahunIni.filter((t) => t.status === 'lunas').length,
    totalTahunIni: tahunIni.length,
    belum,
    totalBelum: belum.reduce((s, t) => s + t.nominal, 0),
  };
}

export function useBerandaData({ desktop }) {
  const { warga } = useAuth();
  const { pengaturan } = useSettings();
  const ipl = useAsync(() => tagihanRumah(warga?.rumah_id), [warga?.rumah_id]);
  const pengumuman = useAsync(() => daftarPengumuman({ limit: 3 }), []);
  const stat = useAsync(statistik, []);
  const chart = useAsync(() => statistikIplBulanan(new Date().getFullYear()), [], { enabled: desktop });
  const agenda = useAsync(() => daftarKegiatan({ limit: 3 }), []);
  const aktivitas = useAsync(() => aktivitasTerbaru(4), []);
  const notif = useAsync(() => daftarNotifikasi({ limit: 4 }), [], { enabled: desktop });
  const kontak = useAsync(daftarKontakDarurat, [], { enabled: desktop });
  const weather = useAsync(() => cuaca(pengaturan.latitude, pengaturan.longitude), [pengaturan.latitude, pengaturan.longitude]);
  return { ipl, pengumuman, stat, chart, agenda, aktivitas, notif, kontak, weather };
}
