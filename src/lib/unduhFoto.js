/**
 * Mengunduh foto dari tautan luar (https) ke peramban untuk disalin ke penyimpanan sendiri.
 * Murni (tanpa Supabase) agar bisa diuji. Berjalan di PERAMBAN: situs foto harus mengizinkan
 * pengambilan lintas-situs (CORS). Banyak layanan tidak mengizinkannya (mis. sebagian tautan Google Drive);
 * bila gagal, kembalikan galat berbahasa Indonesia agar pengguna bisa mengunduh lalu mengunggah manual.
 */
export const BATAS_BYTE = 5 * 1024 * 1024;
export const PESAN_TIDAK_BISA_SALIN = 'Situs penyimpan foto tidak mengizinkan penyalinan otomatis. Unduh fotonya lalu unggah dari perangkat.';

/** Kenali jenis gambar dari byte awal (tidak percaya pada header Content-Type dari situs luar). */
export function jenisGambar(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { type: 'image/png', ext: 'png' };
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { type: 'image/webp', ext: 'webp' };
  return null;
}

/**
 * Unduh gambar dari tautan https. Mengembalikan File (jpeg/png/webp, maks. 5 MB).
 * opsi.fetchImpl: untuk pengujian. opsi.batasMs: waktu tunggu.
 */
export async function unduhFotoTautan(url, { fetchImpl = globalThis.fetch, maxByte = BATAS_BYTE, batasMs = 20000 } = {}) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { throw new Error('Tautan foto tidak valid'); }
  if (u.protocol !== 'https:') throw new Error('Tautan foto harus diawali https://');
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), batasMs) : null;
  let res;
  try {
    res = await fetchImpl(u.toString(), { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow', signal: ac?.signal });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Situs foto terlalu lama menjawab. Coba lagi nanti atau unggah dari perangkat.');
    throw new Error(PESAN_TIDAK_BISA_SALIN); // kegagalan jaringan dan penolakan CORS tampak sama di peramban
  } finally { if (timer) clearTimeout(timer); }
  if (!res.ok) throw new Error(`Situs foto menjawab galat ${res.status}. Periksa tautannya atau unggah dari perangkat.`);
  const panjang = Number(res.headers?.get?.('content-length') || 0);
  if (panjang > maxByte) throw new Error('Ukuran foto maksimal 5 MB');
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > maxByte) throw new Error('Ukuran foto maksimal 5 MB');
  const jenis = jenisGambar(buf);
  if (!jenis) throw new Error('Tautan itu bukan gambar JPG, PNG, atau WEBP. Tempel alamat gambar langsung.');
  return new File([buf], `foto.${jenis.ext}`, { type: jenis.type });
}
