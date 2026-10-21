import { toCsv, unduhBerkas, stempelTanggal } from './csv.js';

/** 6281234567890 -> 0812-3456-7890 (tanpa "+": aman dari penanda rumus Excel dan tetap terbaca sebagai teks) */
export function hpLokal(hp) {
  const d = String(hp || '').replace(/\D/g, '');
  const l = d.startsWith('62') ? d.slice(2) : d.replace(/^0/, '');
  return l ? `0${[l.slice(0, 3), l.slice(3, 7), l.slice(7)].filter(Boolean).join('-')}` : '';
}

/** Kolom berkas PIN awal untuk pengurus: nama, HP, PIN awal. */
export const KOLOM_PIN_AWAL = [
  { key: 'nama', label: 'nama' },
  { key: 'hp', label: 'hp', nilai: (a) => hpLokal(a.hp) },
  { key: 'pin', label: 'pin_awal' },
];

/** Isi CSV (BOM UTF-8, pemisah titik koma) dari daftar akun hasil import_warga: [{nama, hp, pin}] */
export const csvPinAwal = (akun) => toCsv(akun, KOLOM_PIN_AWAL);

/** Unduh berkas PIN awal. Mengembalikan jumlah baris. */
export function unduhPinAwal(akun, nama = 'pin-awal-warga') {
  unduhBerkas(`${nama}-${stempelTanggal()}.csv`, csvPinAwal(akun));
  return akun.length;
}
