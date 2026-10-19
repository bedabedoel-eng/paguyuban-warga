/**
 * Alamat warga. Satu blok bisa berisi beberapa jalan.
 * Contoh: Blok C 3/5 · Jl. Zamrud
 */

/** Pola nomor rumah yang diterima database: 12, 3/5, 7A, C.3, 10-B (maks. 10 karakter). */
export const POLA_NOMOR_RUMAH = /^[0-9A-Za-z][0-9A-Za-z/.-]{0,9}$/;

export const cariGang = (gang = [], id) => (id ? gang.find((g) => g.id === id) || null : null);

/** "C-3/5" */
export function kodeRumah(w) {
  if (!w?.blok) return '';
  return w.no_rumah ? `${w.blok}-${w.no_rumah}` : `Blok ${w.blok}`;
}

/** "Blok C 3/5 · Jl. Zamrud" */
export function alamatLengkap(w, gang = []) {
  if (!w?.blok) return '';
  const g = cariGang(gang, w.gang_id);
  return [`Blok ${w.blok}${w.no_rumah ? ` ${w.no_rumah}` : ''}`, g?.nama].filter(Boolean).join(' · ');
}

/** "C-3/5 · Jl. Zamrud" (ringkas, untuk baris daftar) */
export function alamatRingkas(w, gang = []) {
  const g = cariGang(gang, w?.gang_id);
  return [kodeRumah(w), g?.nama].filter(Boolean).join(' · ');
}

/** Gang yang ada di sebuah blok (termasuk gang lintas blok). */
export const gangDiBlok = (gang = [], blok) => gang.filter((g) => !g.blok || g.blok === blok);

/** Label sasaran pengumuman/kegiatan: null = semua warga. */
export function labelSasaran(x, gang = []) {
  if (x?.gang_id) return cariGang(gang, x.gang_id)?.nama || 'Gang tertentu';
  if (x?.blok) return `Blok ${x.blok}`;
  return null;
}
