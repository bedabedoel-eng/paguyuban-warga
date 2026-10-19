// Uji unit tanpa dependensi tambahan: `npm test` (Node >= 20, node:test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, parseCsv, stempelTanggal } from '../../src/lib/csv.js';

const kolom = [{ key: 'a', label: 'a' }];
const isi = (v) => toCsv([{ a: v }], kolom).split('\r\n')[1];

test('angka negatif tetap angka (tidak diberi awalan apostrof)', () => {
  assert.equal(isi(-50000), '-50000');
  assert.equal(isi('-50000'), '-50000');
  assert.equal(isi('-12,5').replace(/"/g, ''), '-12,5');
});

test('rumus berbahaya tetap dinetralkan', () => {
  assert.equal(isi('=1+1'), "'=1+1");
  assert.equal(isi('+62812'), "'+62812");
  assert.equal(isi('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(isi('-1+2'), "'-1+2");
  assert.equal(isi('-cmd|calc'), "'-cmd|calc");
});

test('tanda kutip, titik koma, dan baris baru di-escape', () => {
  assert.equal(isi('a;b'), '"a;b"');
  assert.equal(isi('x"y'), '"x""y"');
});

test('parseCsv membaca ulang hasil toCsv', () => {
  const csv = toCsv([{ a: 'Budi; Santoso', b: 'ok' }], [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }]);
  const rows = parseCsv(csv);
  assert.deepEqual(rows[1], ['Budi; Santoso', 'ok']);
});

test('stempelTanggal memakai tanggal lokal perangkat, bukan UTC', () => {
  // 20 Okt 2026 pukul 00.30 waktu lokal: toISOString() bisa menghasilkan 19 Okt di zona UTC+7
  assert.equal(stempelTanggal(new Date(2026, 9, 20, 0, 30)), '2026-10-20');
  assert.equal(stempelTanggal(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
