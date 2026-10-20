// Uji logika daftar data: `npm test`
import test from 'node:test';
import assert from 'node:assert/strict';
import { cocokCari, angkaParam, olahDaftar, hitungPilihan, UKURAN_HALAMAN } from '../../src/lib/daftar.js';

const rows = [
  { id: 1, kode: 'A 10', blok: 'A', status: 'dihuni', tarif: 75000 },
  { id: 2, kode: 'A 2', blok: 'A', status: 'kosong', tarif: null },
  { id: 3, kode: 'B 1', blok: 'B', status: 'dihuni', tarif: 50000 },
  { id: 4, kode: 'C 7/5', blok: 'C', status: 'dihuni', tarif: null },
];
const filterDef = [
  { key: 'blok', test: (r, v) => r.blok === v },
  { key: 'status', test: (r, v) => r.status === v },
];
const kolom = [{ key: 'kode', sort: (r) => r.kode }, { key: 'tarif', sort: (r) => r.tarif }];

test('cari: semua kata harus cocok, tanpa peduli huruf besar/kecil', () => {
  assert.equal(cocokCari('Rumah A 10 dihuni', 'a 10'), true);
  assert.equal(cocokCari('Rumah A 10 dihuni', 'A kosong'), false);
  assert.equal(cocokCari('apa saja', '   '), true);
});

test('angkaParam menolak nilai di luar daftar atau bukan angka', () => {
  assert.equal(angkaParam('50', 25, UKURAN_HALAMAN), 50);
  assert.equal(angkaParam('999999', 25, UKURAN_HALAMAN), 25);
  assert.equal(angkaParam('abc', 25, UKURAN_HALAMAN), 25);
  assert.equal(angkaParam('-3', 1), 1);
  assert.equal(angkaParam(null, 1), 1);
});

test('filter digabung (AND) dan nilai kosong diabaikan', () => {
  const r = olahDaftar(rows, { filter: { blok: 'A', status: 'dihuni' }, filterDef });
  assert.deepEqual(r.hasil.map((x) => x.id), [1]);
  assert.equal(olahDaftar(rows, { filter: { blok: '' }, filterDef }).total, 4);
});

test('sortir: angka alami, kosong selalu di akhir pada kedua arah', () => {
  const naik = olahDaftar(rows, { sort: { key: 'kode', dir: 'asc' }, kolom }).hasil.map((x) => x.kode);
  assert.deepEqual(naik, ['A 2', 'A 10', 'B 1', 'C 7/5']);
  const turun = olahDaftar(rows, { sort: { key: 'tarif', dir: 'desc' }, kolom }).hasil.map((x) => x.id);
  assert.deepEqual(turun, [1, 3, 2, 4]);
  const naikTarif = olahDaftar(rows, { sort: { key: 'tarif', dir: 'asc' }, kolom }).hasil.map((x) => x.id);
  assert.deepEqual(naikTarif.slice(0, 2), [3, 1]);
});

test('kolom tanpa fungsi sort diabaikan, data asli tidak diubah', () => {
  const salin = [...rows];
  const r = olahDaftar(rows, { sort: { key: 'blok', dir: 'desc' }, kolom: [{ key: 'blok' }] });
  assert.deepEqual(r.hasil.map((x) => x.id), [1, 2, 3, 4]);
  assert.deepEqual(rows, salin);
});

test('halaman: potong benar dan nomor halaman dijepit ke rentang valid', () => {
  const banyak = Array.from({ length: 23 }, (_, i) => ({ id: i }));
  const h1 = olahDaftar(banyak, { hal: 1, per: 10 });
  assert.equal(h1.tampil.length, 10);
  assert.equal(h1.jumlahHalaman, 3);
  const h3 = olahDaftar(banyak, { hal: 3, per: 10 });
  assert.equal(h3.tampil.length, 3);
  assert.equal(h3.dari, 20);
  assert.equal(h3.sampai, 23);
  assert.equal(olahDaftar(banyak, { hal: 99, per: 10 }).halaman, 3);
  assert.equal(olahDaftar(banyak, { hal: 0, per: 10 }).halaman, 1);
  const kosong = olahDaftar([], { hal: 5, per: 10 });
  assert.equal(kosong.halaman, 1);
  assert.equal(kosong.total, 0);
});

test('hitungPilihan memperhitungkan filter lain tetapi bukan filternya sendiri', () => {
  const f = { status: 'dihuni', blok: 'A' };
  assert.equal(hitungPilihan(rows, filterDef, f, 'blok', ''), 3); // semua blok, status dihuni
  assert.equal(hitungPilihan(rows, filterDef, f, 'blok', 'B'), 1);
  assert.equal(hitungPilihan(rows, filterDef, f, 'blok', 'A'), 1);
});
