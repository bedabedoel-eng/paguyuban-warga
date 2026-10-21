import { uploadFile, removeFile } from './storage';
import { normalisasiLinkFoto, adaUrl } from './image';
import { unduhFotoTautan } from './unduhFoto';

/** Keadaan awal komponen FotoInput. */
export const FOTO_AWAL = { mode: 'unggah', file: null, link: '', hapus: false };

/** Adakah perubahan foto yang perlu disimpan? */
export const fotoBerubah = (v) => !!v.file || !!v.link.trim() || v.hapus;

/**
 * Terapkan pilihan foto (unggah / tautan / hapus) dan kembalikan nilai foto_path baru.
 * Tautan luar DISALIN ke penyimpanan sendiri (agar tidak hilang bila situs asal berubah dan agar foto tidak
 * dimuat dari situs pihak ketiga). Bila situs asal tidak mengizinkan penyalinan, tautan disimpan apa adanya
 * dan `onSalinGagal(galat)` dipanggil agar pengguna diberi tahu.
 * File lama di storage ikut dihapus bila tergantikan (tautan luar tidak disentuh).
 */
export async function terapkanFoto(v, { folder, lama = null, opsi, onSalinGagal }) {
  let baru = lama || null;
  if (v.mode === 'link' && v.link.trim()) {
    const url = normalisasiLinkFoto(v.link);
    try { baru = await salinFotoTautan(url, { folder, opsi }); } catch (e) { baru = url; onSalinGagal?.(e); }
  } else if (v.mode === 'unggah' && v.file) baru = await uploadFile('konten', folder, v.file, opsi);
  else if (v.hapus) baru = null;
  if (lama && baru !== lama && !adaUrl(lama)) removeFile('konten', lama).catch(() => {});
  return baru;
}

/** Salin gambar dari tautan https ke bucket 'konten' dan kembalikan path penyimpanannya. */
export async function salinFotoTautan(url, { folder, opsi } = {}) {
  const file = await unduhFotoTautan(url);
  return uploadFile('konten', folder, file, opsi);
}
