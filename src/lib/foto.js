import { uploadFile, removeFile } from './storage';
import { normalisasiLinkFoto, adaUrl } from './image';

/** Keadaan awal komponen FotoInput. */
export const FOTO_AWAL = { mode: 'unggah', file: null, link: '', hapus: false };

/** Adakah perubahan foto yang perlu disimpan? */
export const fotoBerubah = (v) => !!v.file || !!v.link.trim() || v.hapus;

/**
 * Terapkan pilihan foto (unggah / tautan / hapus) dan kembalikan nilai foto_path baru.
 * File lama di storage ikut dihapus bila tergantikan (tautan luar tidak disentuh).
 */
export async function terapkanFoto(v, { folder, lama = null, opsi }) {
  let baru = lama || null;
  if (v.mode === 'link' && v.link.trim()) baru = normalisasiLinkFoto(v.link);
  else if (v.mode === 'unggah' && v.file) baru = await uploadFile('konten', folder, v.file, opsi);
  else if (v.hapus) baru = null;
  if (lama && baru !== lama && !adaUrl(lama)) removeFile('konten', lama).catch(() => {});
  return baru;
}
