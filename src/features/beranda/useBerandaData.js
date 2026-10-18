import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { cuaca } from '../../services/dashboard';
import { tagihanRumah } from '../../services/ipl';
import { daftarPengumuman } from '../../services/pengumuman';
import { daftarKegiatan } from '../../services/kegiatan';
import { daftarNotifikasi } from '../../services/notifikasi';
import { daftarKontakDarurat } from '../../services/pengaturan';
import { ringkasanKas } from '../../services/kas';
import { awalBulan } from '../../lib/format';

/** Ringkas status IPL dari daftar tagihan rumah. */
export function ringkasIpl(tagihan = []) {
  const terbaru = tagihan[0] || null;
  const tahun = new Date().getFullYear();
  const tahunIni = tagihan.filter((t) => Number(t.periode.slice(0, 4)) === tahun);
  const belum = tagihan.filter((t) => t.status === 'belum_bayar');
  const menunggu = tagihan.filter((t) => t.status === 'menunggu_verifikasi');
  return {
    terbaru,
    lunasTahunIni: tahunIni.filter((t) => t.status === 'lunas').length,
    totalTahunIni: tahunIni.length,
    belum,
    menunggu,
    totalBelum: belum.reduce((s, t) => s + t.nominal, 0),
  };
}

export function useBerandaData() {
  const { warga } = useAuth();
  const { pengaturan } = useSettings();
  const ipl = useAsync(() => tagihanRumah(warga?.rumah_id), [warga?.rumah_id]);
  const pengumuman = useAsync(() => daftarPengumuman({ limit: 4 }), []);
  const agenda = useAsync(() => daftarKegiatan({ limit: 4 }), []);
  const notif = useAsync(() => daftarNotifikasi({ limit: 5 }), []);
  const kontak = useAsync(daftarKontakDarurat, []);
  const kas = useAsync(() => ringkasanKas(awalBulan()), []);
  const weather = useAsync(() => cuaca(pengaturan.latitude, pengaturan.longitude), [pengaturan.latitude, pengaturan.longitude]);
  return { ipl, pengumuman, agenda, notif, kontak, kas, weather };
}
