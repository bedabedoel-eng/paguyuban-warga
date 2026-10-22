import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Tiruan lingkungan peramban minimal agar src/lib/pwa.js bisa diuji dengan `node --test`
const penyimpanan = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function lingkungan({ ua, standalone = false }) {
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def('navigator', { userAgent: ua, platform: 'Linux', maxTouchPoints: 5 });
  def('window', { matchMedia: (q) => ({ matches: standalone && q.includes('standalone') }), navigator: globalThis.navigator, addEventListener() {}, dispatchEvent() {} });
  def('localStorage', penyimpanan());
  def('sessionStorage', penyimpanan());
}
const ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const WEBVIEW = 'Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_IAB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

let pwa;
beforeEach(async () => { lingkungan({ ua: ANDROID }); pwa = await import('../../src/lib/pwa.js'); });

test('HP yang belum memasang: ajakan tampil', () => {
  lingkungan({ ua: ANDROID });
  assert.equal(pwa.perluAjakPasang(), true);
});

test('Komputer: tidak ada ajakan', () => {
  lingkungan({ ua: DESKTOP });
  assert.equal(pwa.perluAjakPasang(), false);
});

test('Ditutup hanya menyembunyikan pada sesi itu; sesi baru muncul lagi', () => {
  lingkungan({ ua: ANDROID });
  pwa.tundaPasang();
  assert.equal(pwa.perluAjakPasang(), false);
  sessionStorage.removeItem('pw:pasang-tunda'); // sesi baru = sessionStorage kosong
  assert.equal(pwa.perluAjakPasang(), true);
});

test('Dibuka dari ikon terpasang: tidak ada ajakan, dan diingat untuk tab browser', () => {
  lingkungan({ ua: ANDROID, standalone: true });
  assert.equal(pwa.perluAjakPasang(), false);
  const ls = localStorage;
  lingkungan({ ua: ANDROID }); // dibuka lewat tab browser di perangkat yang sama
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
  assert.equal(pwa.perluAjakPasang(), false);
});

test('Deteksi browser di dalam aplikasi lain', () => {
  lingkungan({ ua: WEBVIEW }); assert.equal(pwa.browserDalamAplikasi(), true);
  lingkungan({ ua: IPHONE_IAB }); assert.equal(pwa.browserDalamAplikasi(), true);
  lingkungan({ ua: IPHONE_SAFARI }); assert.equal(pwa.browserDalamAplikasi(), false);
  lingkungan({ ua: ANDROID }); assert.equal(pwa.browserDalamAplikasi(), false);
});
