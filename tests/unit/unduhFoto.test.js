import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unduhFotoTautan, jenisGambar, PESAN_TIDAK_BISA_SALIN } from '../../src/lib/unduhFoto.js';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const HTML = new TextEncoder().encode('<html>bukan gambar</html>');

const balas = (bytes, { ok = true, status = 200, panjang } = {}) => async () => ({
  ok, status,
  headers: { get: (k) => (k.toLowerCase() === 'content-length' && panjang != null ? String(panjang) : null) },
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});

test('jenisGambar mengenali JPEG/PNG/WEBP dari byte awal, bukan dari header situs', () => {
  assert.deepEqual(jenisGambar(JPEG), { type: 'image/jpeg', ext: 'jpg' });
  assert.deepEqual(jenisGambar(PNG), { type: 'image/png', ext: 'png' });
  assert.deepEqual(jenisGambar(WEBP), { type: 'image/webp', ext: 'webp' });
  assert.equal(jenisGambar(HTML), null);
  assert.equal(jenisGambar(new Uint8Array()), null);
});

test('unduh berhasil menghasilkan File dengan tipe dari isi berkas', async () => {
  const f = await unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl: balas(PNG) });
  assert.equal(f.type, 'image/png');
  assert.equal(f.name, 'foto.png');
  assert.equal(f.size, PNG.length);
});

test('permintaan memakai mode cors tanpa kuki dan tanpa referrer', async () => {
  let opsi;
  await unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl: async (u, o) => { opsi = o; return balas(JPEG)(); } });
  assert.equal(opsi.mode, 'cors');
  assert.equal(opsi.credentials, 'omit');
  assert.equal(opsi.referrerPolicy, 'no-referrer');
});

test('tautan bukan https atau tidak valid ditolak sebelum menghubungi situs', async () => {
  let dipanggil = false;
  const fetchImpl = async () => { dipanggil = true; return balas(JPEG)(); };
  await assert.rejects(unduhFotoTautan('http://contoh.id/a.jpg', { fetchImpl }), /https/);
  await assert.rejects(unduhFotoTautan('bukan url', { fetchImpl }), /tidak valid/);
  await assert.rejects(unduhFotoTautan('file:///etc/passwd', { fetchImpl }), /https/);
  assert.equal(dipanggil, false);
});

test('penolakan CORS/jaringan menghasilkan pesan petunjuk berbahasa Indonesia', async () => {
  const fetchImpl = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl }), { message: PESAN_TIDAK_BISA_SALIN });
});

test('galat HTTP, bukan gambar, dan terlalu besar ditolak', async () => {
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl: balas(JPEG, { ok: false, status: 404 }) }), /galat 404/);
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl: balas(HTML) }), /bukan gambar/);
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl: balas(JPEG, { panjang: 9 * 1024 * 1024 }) }), /maksimal 5 MB/);
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { maxByte: 4, fetchImpl: balas(JPEG) }), /maksimal 5 MB/);
});

test('waktu tunggu habis menghasilkan pesan khusus', async () => {
  const fetchImpl = (u, { signal }) => new Promise((_, no) => { signal.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; no(e); }); });
  await assert.rejects(unduhFotoTautan('https://contoh.id/a.jpg', { fetchImpl, batasMs: 10 }), /terlalu lama/);
});
