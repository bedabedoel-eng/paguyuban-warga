/** Pembanding untuk pengurutan: angka, tanggal, dan teks (urutan Indonesia, angka alami). Kosong selalu di akhir. */
export function banding(a, b) {
  const kosong = (v) => v == null || v === '';
  if (kosong(a) && kosong(b)) return 0;
  if (kosong(a)) return 1;
  if (kosong(b)) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a - b;
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
}

/** Salinan terurut. nilai(row) mengambil kunci; arah 'asc' | 'desc'. Kosong tetap di akhir pada kedua arah. */
export function urutkan(rows = [], nilai, arah = 'asc') {
  const k = arah === 'desc' ? -1 : 1;
  return [...rows].sort((x, y) => {
    const a = nilai(x); const b = nilai(y);
    const ka = a == null || a === ''; const kb = b == null || b === '';
    if (ka || kb) return banding(a, b);
    return banding(a, b) * k;
  });
}
