import test from 'node:test';
import assert from 'node:assert/strict';
import { gangDariNomor, daftarNomorGang, POLA_NOMOR_RUMAH, pecahNomor, gabungNomor, teksRumah, alamatLengkap, normalisasiAlamat } from '../../src/lib/alamat.js';

const BLOK = ['A', 'B', 'C', 'D'];
const hasil = (x) => { const r = normalisasiAlamat(x, BLOK); return `${r.blok}|${r.sub}|${r.nomor}|${r.no_rumah}`; };

test('pecah dan gabung nomor', () => {
  assert.deepEqual(pecahNomor('3/5'), { sub: '3', nomor: '5' });
  assert.deepEqual(pecahNomor('12'), { sub: '', nomor: '12' });
  assert.equal(gabungNomor('3', '5'), '3/5');
  assert.equal(gabungNomor('', '12'), '12');
  assert.equal(gabungNomor(' a3 ', ' 5 '), 'A3/5');
});

test('tampilan alamat: Blok A 3 No.5', () => {
  assert.equal(teksRumah({ blok: 'A', no_rumah: '3/5' }), 'Blok A 3 No.5');
  assert.equal(teksRumah({ blok: 'A', no_rumah: '12' }), 'Blok A No.12');
  assert.equal(alamatLengkap({ blok: 'C', no_rumah: '3/5', gang_id: 'g' }, [{ id: 'g', nama: 'Jl. Zamrud' }]), 'Blok C 3 No.5 · Jl. Zamrud');
});

test('berbagai penulisan menghasilkan blok A, sub 3, nomor 5', () => {
  for (const x of [
    { blok: 'A3', no: '5' }, { blok: 'A', sub: '3', no: '5' }, { blok: 'A', no: '3/5' }, { rumah: 'Blok A3 No.5' },
    { rumah: 'A3-5' }, { rumah: 'A 3 5' }, { rumah: 'A3/5' }, { blok: 'A', no: 'A3/5' }, { blok: 'a3', no: 'no. 5' }, { rumah: 'A-3/5' },
  ]) assert.equal(hasil(x), 'A|3|5|3/5', JSON.stringify(x));
});

test('tanpa sub-blok tetap sederhana', () => {
  assert.equal(hasil({ blok: 'B', no: '12' }), 'B||12|12');
  assert.equal(hasil({ rumah: 'B-12A' }), 'B||12A|12A');
  assert.equal(hasil({ blok: 'C', no: '10-B' }).split('|')[0], 'C');
});

test('kode blok yang memang ada dipakai apa adanya', () => {
  const r = normalisasiAlamat({ blok: 'A3', no: '5' }, ['A3', 'A']);
  assert.equal(r.blok, 'A3'); assert.equal(r.no_rumah, '5');
});

test('blok tidak dikenal dibiarkan agar divalidasi pemanggil', () => {
  assert.equal(normalisasiAlamat({ blok: 'Z9', no: '5' }, BLOK).blok, 'Z9');
});

test('pola nomor rumah: sub-blok wajib diikuti nomor', () => {
  for (const ok of ['12', '3/5', '7A', 'C.3', '10-B', 'A3/12']) assert.ok(POLA_NOMOR_RUMAH.test(ok), ok);
  for (const bad of ['3/', '/5', '', '3/5/7', '12345678901', ' 5']) assert.ok(!POLA_NOMOR_RUMAH.test(bad), bad);
});

test('jalan otomatis dari cakupan nomor', () => {
  const g = [
    { id: 'melati', nama: 'Jl. Melati', blok: 'A', nomor: '3, 4' },
    { id: 'mawar', nama: 'Jl. Mawar', blok: 'A', nomor: '1' },
    { id: 'kenanga', nama: 'Jl. Kenanga', blok: 'B', nomor: '1-20' },
    { id: 'utama', nama: 'Jl. Utama', blok: null, nomor: '' },
  ];
  assert.deepEqual(daftarNomorGang(g[0]), ['3', '4']);
  assert.equal(gangDariNomor(g, 'A', '3/5').id, 'melati');
  assert.equal(gangDariNomor(g, 'A', '4/1').id, 'melati');
  assert.equal(gangDariNomor(g, 'A', '1/9').id, 'mawar');
  assert.equal(gangDariNomor(g, 'A', '7/1'), null);
  assert.equal(gangDariNomor(g, 'B', '12').id, 'kenanga');
  assert.equal(gangDariNomor(g, 'B', '25'), null);
  assert.equal(gangDariNomor(g, 'A', '3/5').id, 'melati');
});

test('cakupan ganda yang bertabrakan tidak menebak', () => {
  const g = [{ id: 'x', nama: 'X', blok: 'A', nomor: '3' }, { id: 'y', nama: 'Y', blok: 'A', nomor: 'A3' }];
  assert.equal(gangDariNomor(g, 'A', '3/5'), null);
});
