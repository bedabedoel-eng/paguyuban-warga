/** Pembaca CSV sederhana: mendukung tanda kutip, pemisah koma / titik koma / tab, dan BOM. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Contoh berkas untuk diunduh admin. */
export const CONTOH_CSV = 'nama,hp,blok,no_rumah,pekerjaan,kepala_keluarga\n'
  + 'Budi Santoso,081234567890,A,12,Guru,ya\n'
  + 'Siti Aminah,081298765432,A,12,Ibu Rumah Tangga,tidak\n'
  + 'Agus Wijaya,085611112222,B,3,Wiraswasta,ya\n';
