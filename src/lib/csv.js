/** Pembaca CSV sederhana: mendukung tanda kutip, pemisah koma / titik koma / tab, dan BOM. */
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '').replace(/^sep=.\r?\n/i, '');
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
export const CONTOH_CSV = 'nama,hp,blok,sub_blok,no_rumah,jalan,pekerjaan,kepala_keluarga,status_pernikahan,jumlah_anak,foto\n'
  + 'Budi Santoso,081234567890,C,3,5,Jl. Zamrud,Guru,ya,menikah,2,https://contoh.id/budi.jpg\n'
  + 'Siti Aminah,081298765432,C,3,5,Jl. Zamrud,Ibu Rumah Tangga,tidak,menikah,2,\n'
  + 'Agus Wijaya,085611112222,A,,12,,Wiraswasta,ya,belum menikah,,\n';

/** Cegah rumus tersembunyi saat berkas dibuka di Excel / Sheets (CSV injection). */
const ANGKA_NEGATIF = /^-\d+([.,]\d+)?$/; // mis. -50000 atau -12,5: angka murni, bukan rumus
const aman = (v) => {
  if (typeof v === 'number') return String(v);
  const s = v == null ? '' : String(v);
  if (ANGKA_NEGATIF.test(s)) return s;
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

/**
 * Susun CSV yang langsung terbaca Excel (BOM UTF-8, pemisah titik koma untuk Excel Indonesia).
 * kolom: [{ key, label, nilai?(row) }]
 */
export function toCsv(rows, kolom, pemisah = ';') {
  const esc = (v) => {
    const s = aman(v);
    return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const baris = [kolom.map((k) => esc(k.label || k.key)).join(pemisah)];
  for (const r of rows) baris.push(kolom.map((k) => esc(k.nilai ? k.nilai(r) : r[k.key])).join(pemisah));
  return '\ufeff' + baris.join('\r\n') + '\r\n';
}

/** Unduh teks sebagai berkas di peramban. */
export function unduhBerkas(nama, isi, tipe = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }));
  const a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Tanggal hari ini menurut jam perangkat (bukan UTC), mis. 2026-10-20 pukul 05.00 WIB. */
export const stempelTanggal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
