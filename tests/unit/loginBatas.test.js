import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teksTunggu, jamHitungMundur, pesanTunda, LoginDitunda, pesanSalahPin } from '../../src/lib/loginBatas.js';

test('teksTunggu membulatkan ke atas dan memilih satuan', () => {
  assert.equal(teksTunggu(30), '30 detik');
  assert.equal(teksTunggu(60), '1 menit');
  assert.equal(teksTunggu(61), '2 menit');
  assert.equal(teksTunggu(900), '15 menit');
  assert.equal(teksTunggu(3600), '1 jam');
  assert.equal(teksTunggu(-5), '0 detik');
});

test('jamHitungMundur memberi format m:dd', () => {
  assert.equal(jamHitungMundur(75), '1:15');
  assert.equal(jamHitungMundur(9), '0:09');
  assert.equal(jamHitungMundur(0), '0:00');
});

test('LoginDitunda membawa sisa detik dan pesan Indonesia', () => {
  const e = new LoginDitunda(300);
  assert.equal(e.name, 'LoginDitunda');
  assert.equal(e.tunggu, 300);
  assert.equal(e.message, pesanTunda(300));
  assert.match(e.message, /Coba lagi dalam 5 menit/);
});

test('pesanSalahPin menyebut sisa percobaan hanya saat tinggal sedikit', () => {
  assert.equal(pesanSalahPin(5), 'Nomor HP atau PIN salah.');
  assert.match(pesanSalahPin(2), /Sisa 2 percobaan/);
  assert.equal(pesanSalahPin(0), 'Nomor HP atau PIN salah.');
});
