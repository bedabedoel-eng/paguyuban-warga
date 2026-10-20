import { urutkan } from './sort.js';

/**
 * Logika murni untuk daftar data (cari, filter, sortir, halaman).
 * Dipisah dari React supaya mudah diuji: `npm test`.
 */

export const UKURAN_HALAMAN = [10, 25, 50, 100];
export const UKURAN_BAWAAN = 25;

const kecil = (v) => String(v ?? '').toLowerCase();

/** Baris cocok bila SEMUA kata kunci (dipisah spasi) ditemukan di teks pencarian baris. */
export function cocokCari(teks, kataKunci) {
  const kata = kecil(kataKunci).split(/\s+/).filter(Boolean);
  if (!kata.length) return true;
  const t = kecil(teks);
  return kata.every((k) => t.includes(k));
}

/**
 * Ambil bilangan bulat positif dari parameter URL; di luar `boleh` (bila ada) dipakai `bawaan`.
 * Mencegah ?per=999999 atau ?hal=abc merusak tampilan.
 */
export function angkaParam(nilai, bawaan, boleh) {
  const n = Number.parseInt(nilai, 10);
  if (!Number.isFinite(n) || n < 1) return bawaan;
  if (boleh && !boleh.includes(n)) return bawaan;
  return n;
}

/**
 * Jalankan seluruh alur: cari -> filter -> sortir -> potong halaman.
 * opsi: {
 *   cari: string, ambilCari: (row) => string,
 *   filter: { [kunci]: nilai },  filterDef: [{ key, test(row, nilai) }],
 *   sort: { key, dir } | null,   kolom: [{ key, sort?(row) }],
 *   hal, per
 * }
 */
export function olahDaftar(rows = [], { cari = '', ambilCari, filter = {}, filterDef = [], sort = null, kolom = [], hal = 1, per = UKURAN_BAWAAN } = {}) {
  let hasil = rows;
  if (cari && ambilCari) hasil = hasil.filter((r) => cocokCari(ambilCari(r), cari));
  for (const f of filterDef) {
    const nilai = filter[f.key];
    if (nilai !== undefined && nilai !== '' && nilai !== null) hasil = hasil.filter((r) => f.test(r, nilai));
  }
  const k = sort ? kolom.find((c) => c.key === sort.key && c.sort) : null;
  if (k) hasil = urutkan(hasil, k.sort, sort.dir === 'desc' ? 'desc' : 'asc');
  const total = hasil.length;
  const jumlahHalaman = Math.max(1, Math.ceil(total / per));
  const halaman = Math.min(Math.max(1, hal), jumlahHalaman);
  const dari = (halaman - 1) * per;
  return { hasil, tampil: hasil.slice(dari, dari + per), total, halaman, jumlahHalaman, dari, sampai: Math.min(dari + per, total) };
}

/** Hitung jumlah baris per pilihan filter (untuk chip berangka). Filter lain tetap berlaku. */
export function hitungPilihan(rows, filterDef, filter, kunci, nilai, { cari = '', ambilCari } = {}) {
  const lain = filterDef.filter((f) => f.key !== kunci);
  const dasar = olahDaftar(rows, { cari, ambilCari, filter, filterDef: lain }).hasil;
  const f = filterDef.find((x) => x.key === kunci);
  return nilai === '' ? dasar.length : dasar.filter((r) => f.test(r, nilai)).length;
}
