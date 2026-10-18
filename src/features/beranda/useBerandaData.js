import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { cuaca, statistikIplBulanan, arusKas } from '../../services/dashboard';
import { daftarWarga } from '../../services/warga';
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
  const tahun = new Date().getFullYear();
  const grafikIpl = useAsync(() => statistikIplBulanan(tahun), [tahun]);
  const grafikKas = useAsync(() => arusKas(tahun), [tahun]);
  // Tetangga: gang yang sama, atau blok yang sama bila gang belum dipilih
  const tetangga = useAsync(async () => {
    if (!warga?.gang_id && !warga?.blok) return [];
    const rows = await daftarWarga({ gang: warga.gang_id || '', blok: warga.gang_id ? '' : warga.blok, limit: 40 });
    return rows.filter((x) => x.id !== warga.id).slice(0, 14);
  }, [warga?.id, warga?.gang_id, warga?.blok]);
  const baru = useAsync(async () => (await daftarWarga({ urut: 'baru', limit: 14 })).filter((x) => x.id !== warga?.id), [warga?.id]);
  const weather = useAsync(() => cuaca(pengaturan.latitude, pengaturan.longitude), [pengaturan.latitude, pengaturan.longitude]);
  return { ipl, pengumuman, agenda, notif, kontak, kas, weather, grafikIpl, grafikKas, tetangga, baru, tahun };
}
