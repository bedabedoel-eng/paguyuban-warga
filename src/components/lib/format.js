const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export { BULAN, BULAN_PENDEK, HARI };

const rp = new Intl.NumberFormat('id-ID');
export const rupiah = (n) => `Rp ${rp.format(Math.round(Number(n) || 0))}`;
export const angka = (n) => rp.format(Number(n) || 0);

/** Date dari string 'YYYY-MM-DD' tanpa geser zona waktu. */
export function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); }
  return new Date(v);
}

export function tanggal(v, { pendek = false, hari = false } = {}) {
  const d = parseDate(v);
  if (!d || isNaN(d)) return '-';
  const s = `${d.getDate()} ${(pendek ? BULAN_PENDEK : BULAN)[d.getMonth()]} ${d.getFullYear()}`;
  return hari ? `${HARI[d.getDay()]}, ${s}` : s;
}

export function jam(v) {
  const d = parseDate(v);
  if (!d || isNaN(d)) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const tanggalJam = (v) => `${tanggal(v, { pendek: true })} • ${jam(v)}`;

/** '2025-05-01' -> 'Mei 2025' */
export function periode(v, pendek = false) {
  const d = parseDate(v);
  if (!d || isNaN(d)) return '-';
  return `${(pendek ? BULAN_PENDEK : BULAN)[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'YYYY-MM-01' untuk bulan dari Date */
export function awalBulan(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Nilai untuk <input type="datetime-local"> dari ISO */
export function toLocalInput(v) {
  const d = parseDate(v);
  if (!d || isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function relatif(v) {
  const d = parseDate(v);
  if (!d) return '';
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return tanggal(d, { pendek: true });
}

export function salam(d = new Date()) {
  const h = d.getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export const inisial = (nama = '') => nama.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('') || '?';
