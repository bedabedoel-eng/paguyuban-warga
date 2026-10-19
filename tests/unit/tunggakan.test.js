import test from 'node:test';
import assert from 'node:assert/strict';
import { pesanTunggakan, tautanPengingat, ringkasTunggakan } from '../../src/lib/tunggakan.js';

const t = { kode: 'A-10', nama: 'Budi', jumlah_bulan: 3, total: 225000, periode_tertua: '2026-05-01', periode_terbaru: '2026-07-01', nomor_hp: '6281234567890', blok: 'A' };
const p = { nama_paguyuban: 'Paguyuban Contoh', bank_nama: 'BCA', bank_norek: '123456', bank_atas_nama: 'Bendahara' };

test('pesan memuat rumah, jumlah bulan, rentang, total, dan rekening', () => {
  const s = pesanTunggakan(t, p);
  for (const x of ['Budi', 'A-10', '3 bulan', 'Mei 2026 s.d. Juli 2026', '225.000', 'BCA 123456']) assert.ok(s.includes(x), x);
});

test('tanpa rekening, pesan mengarahkan ke aplikasi/bendahara', () => {
  assert.ok(pesanTunggakan(t, {}).includes('aplikasi'));
});

test('tautan WhatsApp memakai nomor internasional dan teks ter-encode; null bila tanpa HP', () => {
  const u = tautanPengingat(t, p);
  assert.ok(u.startsWith('https://wa.me/6281234567890?text='));
  assert.ok(!u.includes('\n'));
  assert.equal(tautanPengingat({ ...t, nomor_hp: null }, p), null);
});

test('satu bulan menampilkan satu periode saja', () => {
  assert.ok(pesanTunggakan({ ...t, jumlah_bulan: 1, periode_terbaru: t.periode_tertua }, p).includes('(Mei 2026)'));
});

test('ringkasTunggakan menjumlah per blok', () => {
  const r = ringkasTunggakan([t, { ...t, kode: 'A-11', total: 75000 }, { ...t, kode: 'B-1', blok: 'B', total: 50000 }]);
  assert.equal(r.rumah, 3); assert.equal(r.total, 350000); assert.equal(r.blok.A.rumah, 2); assert.equal(r.blok.B.total, 50000);
});
