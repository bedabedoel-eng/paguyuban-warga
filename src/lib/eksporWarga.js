import { toCsv, unduhBerkas, stempelTanggal } from './csv';
import { cariGang } from './alamat';

/** Kolom ekspor warga. Urutan awal sama dengan berkas import sehingga hasil ekspor bisa diimpor ulang. */
/** 6281234567890 -> 0812-3456-7890 (tanpa "+", aman dari penanda rumus Excel dan terbaca saat diimpor ulang) */
const hpLokal = (hp) => {
  const d = String(hp || '').replace(/\D/g, '');
  const l = d.startsWith('62') ? d.slice(2) : d.replace(/^0/, '');
  return l ? `0${[l.slice(0, 3), l.slice(3, 7), l.slice(7)].filter(Boolean).join('-')}` : '';
};

export const KOLOM_EKSPOR_WARGA = (gang) => [
  { key: 'nama', label: 'nama' },
  { key: 'hp', label: 'hp', nilai: (w) => hpLokal(w.kontak?.nomor_hp) },
  { key: 'blok', label: 'blok' },
  { key: 'no_rumah', label: 'no_rumah' },
  { key: 'gang', label: 'gang', nilai: (w) => cariGang(gang, w.gang_id)?.nama || '' },
  { key: 'pekerjaan', label: 'pekerjaan' },
  { key: 'kepala_keluarga', label: 'kepala_keluarga', nilai: (w) => (w.kepala_keluarga ? 'ya' : 'tidak') },
  { key: 'status', label: 'status' },
  { key: 'bergabung', label: 'bergabung', nilai: (w) => (w.bergabung_at ? String(w.bergabung_at).slice(0, 10) : '') },
];

/** Unduh daftar warga sebagai CSV. Mengembalikan jumlah baris. */
export function eksporWarga(rows, gang, nama = 'direktori-warga') {
  unduhBerkas(`${nama}-${stempelTanggal()}.csv`, toCsv(rows, KOLOM_EKSPOR_WARGA(gang)));
  return rows.length;
}
