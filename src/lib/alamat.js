/**
 * Alamat warga. Satu blok bisa berisi beberapa jalan.
 * Contoh: Blok C 3/5 · Jl. Zamrud
 */

/** Pola nomor rumah: 12, 3/5, 7A, C.3, 10-B (maks. 10 karakter); garis miring maksimal satu dan harus diikuti nomor. */
export const POLA_NOMOR_RUMAH = /^(?=.{1,10}$)[0-9A-Za-z][0-9A-Za-z.-]*(\/[0-9A-Za-z][0-9A-Za-z.-]*)?$/;

export const cariGang = (gang = [], id) => (id ? gang.find((g) => g.id === id) || null : null);

/** "C-3/5" */
export function kodeRumah(w) {
  if (!w?.blok) return '';
  return w.no_rumah ? `${w.blok}-${w.no_rumah}` : `Blok ${w.blok}`;
}

/**
 * Nomor rumah disimpan dalam satu kolom `no_rumah`: "3/5" = sub-blok 3, nomor 5; "12" = nomor 12 tanpa sub-blok.
 * Dua fungsi ini memisah/menggabungkannya agar bisa diisi dan direkap per kolom.
 */
export function pecahNomor(no) {
  const t = String(no || '').trim().toUpperCase();
  const i = t.indexOf('/');
  return i < 0 ? { sub: '', nomor: t } : { sub: t.slice(0, i), nomor: t.slice(i + 1) };
}
export const gabungNomor = (sub, nomor) => {
  const s = String(sub || '').trim().toUpperCase(); const n = String(nomor || '').trim().toUpperCase();
  return s && n ? `${s}/${n}` : n || (s ? `${s}/` : '');
};

/** "Blok A 3 No.5" (dengan sub-blok) atau "Blok A No.12" */
export function teksRumah(w) {
  if (!w?.blok) return '';
  const { sub, nomor } = pecahNomor(w.no_rumah);
  return [`Blok ${w.blok}`, sub, nomor && `No.${nomor}`].filter(Boolean).join(' ');
}

/** "Blok A 3 No.5 · Jl. Zamrud" */
export function alamatLengkap(w, gang = []) {
  if (!w?.blok) return '';
  const g = cariGang(gang, w.gang_id);
  return [teksRumah(w), g?.nama].filter(Boolean).join(' · ');
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

/**
 * Menormalkan alamat dari berbagai cara penulisan menjadi { blok, sub, nomor, no_rumah }.
 * Contoh yang dipahami (blok A, sub-blok 3, nomor 5):
 *   blok "A3" + no "5" · blok "A" + sub "3" + no "5" · blok "A" + no "3/5" · alamat "Blok A3 No.5"
 *   "A3-5" · "A 3 5" · "A3/5" · blok "A" + no "A3/5"
 * `kodeBlok` = daftar kode blok yang ada; bila blok yang ditulis ("A3") sendiri adalah kode blok, dipakai apa adanya.
 */
export function normalisasiAlamat({ blok = '', sub = '', no = '', rumah = '' } = {}, kodeBlok = []) {
  const bersih = (v) => String(v ?? '').toUpperCase().replace(/\bBLOK\b/g, ' ').replace(/\b(NOMOR|NO)\b\.?/g, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
  let b = bersih(blok).replace(/\s+/g, ''); let s = bersih(sub).replace(/\s+/g, ''); let n = bersih(no).replace(/\s+/g, '');
  const ada = (k) => kodeBlok.includes(k);

  if ((!b || !n) && rumah) {
    const t = bersih(rumah).split(/[\s\-/]+/).filter(Boolean);
    if (t.length) {
      const [awal, ...sisa] = t;
      if (!b) {
        const m = awal.match(/^([A-Z]+)(\d+)$/);
        if (ada(awal) || !m) b = awal;
        else if (ada(m[1])) { b = m[1]; s = s || m[2]; } else b = awal;
      }
      if (!n) {
        if (sisa.length >= 2 && !s) { s = sisa[0]; n = sisa.slice(1).join(''); } else n = sisa.join('/');
      }
    }
  }
  if (b && !ada(b)) {
    const m = b.match(/^([A-Z]+)(\d+)$/);
    if (m && ada(m[1])) { b = m[1]; s = s || m[2]; }
  }
  // nomor yang diawali kode blok ("A3/5" pada blok A) -> buang awalan
  if (b && n.startsWith(b) && /^\d/.test(n.slice(b.length))) n = n.slice(b.length);
  n = n.replace(/[-]/g, '/');
  if (n.includes('/') && !s) { const p = pecahNomor(n); s = p.sub; n = p.nomor; }
  else if (n.includes('/')) n = pecahNomor(n).nomor;
  return { blok: b, sub: s, nomor: n, no_rumah: gabungNomor(s, n) };
}
