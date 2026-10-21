import { test } from 'node:test';
import assert from 'node:assert/strict';
import { olahBaris } from '../../src/lib/importWarga.js';
import { parseCsv, CONTOH_CSV } from '../../src/lib/csv.js';
import { normalizeHp, formatHp } from '../../src/lib/nomorHp.js';

const BLOK = ['A', 'B', 'C'];
const GANG = [
  { id: 'g1', nama: 'Jl. Zamrud', blok: 'C', nomor: '3' },
  { id: 'g2', nama: 'Jl. Berlian', blok: 'A', nomor: '1-20' },
];
const olah = (csv, blok = BLOK, gang = GANG) => olahBaris(parseCsv(csv), blok, gang);

test('nomor HP: berbagai penulisan dinormalkan ke 62...', () => {
  assert.equal(normalizeHp('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeHp('81234567890'), '6281234567890');
  assert.equal(normalizeHp('+62 812 3456 7890'), '6281234567890');
  assert.equal(normalizeHp('123'), null);
  assert.equal(formatHp('6281234567890'), '+62 812-3456-7890');
});

test('contoh CSV bawaan lolos semua baris dan memuat hunian', () => {
  const { kurang, list } = olah(CONTOH_CSV);
  assert.deepEqual(kurang, []);
  assert.equal(list.length, 3);
  assert.ok(list.every((x) => !x.galat), JSON.stringify(list.map((x) => x.galat)));
  assert.equal(list[0].status_hunian, 'milik_sendiri');
  assert.equal(list[2].status_hunian, 'kontrak');
  assert.equal(list[0].blok, 'C');
  assert.equal(list[0].sub_blok, '3');
  assert.equal(list[0].no_rumah, '3/5');
  assert.equal(list[0].gang, 'Jl. Zamrud');
  assert.equal(list[0].baris, 2);
});

test('kolom wajib hilang dilaporkan', () => {
  const { kurang, list } = olah('nama,blok\nBudi,A\n');
  assert.deepEqual(kurang.sort(), ['hp', 'no_rumah']);
  assert.deepEqual(list, []);
});

test('alias judul kolom dikenali (Excel Indonesia, titik koma)', () => {
  const csv = 'Nama Lengkap;No HP;Blok;Nomor Rumah;Hunian;Status Pernikahan;Jumlah Anak\nSiti;0812-9876-5432;B;7;Kontrakan;Menikah;2\n';
  const { list } = olah(csv);
  assert.equal(list[0].nama, 'Siti');
  assert.equal(list[0].hp, '6281298765432');
  assert.equal(list[0].status_hunian, 'kontrak');
  assert.equal(list[0].status_pernikahan, 'menikah');
  assert.equal(list[0].jumlah_anak, '2');
  assert.equal(list[0].galat, '');
});

test('status hunian: sinonim dipetakan; nilai asing menjadi galat baris (bukan menggagalkan semua)', () => {
  const csv = 'nama,hp,blok,no_rumah,status_hunian\nA Satu,081200000001,A,1,hak milik\nB Dua,081200000002,A,2,sewa\nC Tiga,081200000003,A,3,numpang\nD Empat,081200000004,A,4,\n';
  const { list } = olah(csv);
  assert.equal(list[0].status_hunian, 'milik_sendiri');
  assert.equal(list[1].status_hunian, 'kontrak');
  assert.match(list[2].galat, /Rumah ditempati "numpang" tidak dikenal/);
  assert.equal(list[2].status_hunian, '');
  assert.equal(list[3].status_hunian, '');
  assert.equal(list[3].galat, '');
});

test('galat per baris: HP ganda, blok tidak dikenal, nomor kosong, jalan tak ada, anak di luar batas', () => {
  const csv = [
    'nama,hp,blok,no_rumah,jalan,status_pernikahan,jumlah_anak',
    'Satu,081200000001,A,1,,,',
    'Dua,081200000001,A,2,,,',
    'Tiga,081200000003,Z,3,,,',
    'Empat,081200000004,A,,,,',
    'Lima,081200000005,A,5,Jl. Hantu,,',
    'Enam,081200000006,A,6,,menikah,31',
    'Tujuh,12,A,7,,,',
    'X,081200000008,A,8,,,',
    'Sembilan,081200000009,A,9,,entah,',
  ].join('\n');
  const g = olah(csv).list.map((x) => x.galat);
  assert.equal(g[0], '');
  assert.equal(g[1], 'Nomor HP ganda di berkas');
  assert.match(g[2], /Blok "Z" tidak dikenal/);
  assert.equal(g[3], 'Nomor rumah kosong');
  assert.match(g[4], /Jalan "Jl. Hantu" belum ada di Blok A/);
  assert.match(g[5], /Jumlah anak/);
  assert.equal(g[6], 'Nomor HP tidak valid');
  assert.match(g[7], /Nama kosong/);
  assert.match(g[8], /Status pernikahan "entah" tidak dikenal/);
});

test('jalan diisi otomatis dari nomor rumah bila hanya satu jalan cocok; jumlah anak dikosongkan bila belum menikah', () => {
  const csv = 'nama,hp,blok,no_rumah,status_pernikahan,jumlah_anak\nBudi,081200000001,A,12,belum menikah,3\n';
  const { list } = olah(csv);
  assert.equal(list[0].gang, 'Jl. Berlian');
  assert.equal(list[0].jumlah_anak, '');
});

test('alamat gabungan "A3" + nomor dipecah ke blok/sub-blok/nomor', () => {
  const { list } = olah('nama,hp,blok,no_rumah\nBudi,081200000001,C3,5\n');
  assert.equal(list[0].blok, 'C');
  assert.equal(list[0].sub_blok, '3');
  assert.equal(list[0].no_rumah, '3/5');
});

test('foto: tautan Google Drive dinormalkan; tautan rusak menjadi galat', () => {
  const csv = 'nama,hp,blok,no_rumah,foto\nSatu,081200000001,A,1,https://drive.google.com/file/d/ABC123/view\nDua,081200000002,A,2,bukan-url\n';
  const { list } = olah(csv);
  assert.match(list[0].foto, /drive\.google\.com\/thumbnail\?id=ABC123/);
  assert.match(list[1].galat, /Tautan foto tidak valid/);
});
