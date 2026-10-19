import { periode, rupiah } from './format.js';

/** Teks pengingat tunggakan IPL yang sopan dan lengkap (dikirim lewat WhatsApp oleh pengurus). */
export function pesanTunggakan(t, p = {}) {
  const rentang = t.periode_tertua === t.periode_terbaru
    ? periode(t.periode_tertua)
    : `${periode(t.periode_tertua)} s.d. ${periode(t.periode_terbaru)}`;
  const baris = [
    `Assalamualaikum Bapak/Ibu${t.nama ? ` ${t.nama}` : ''}.`,
    '',
    `Kami dari pengurus ${p.nama_paguyuban || 'paguyuban'} mengingatkan bahwa IPL rumah ${t.kode} belum terbayar ${t.jumlah_bulan} bulan (${rentang}) dengan total ${rupiah(t.total)}.`,
  ];
  if (p.bank_norek) baris.push('', `Pembayaran dapat ditransfer ke ${p.bank_nama || 'rekening'} ${p.bank_norek} a.n. ${p.bank_atas_nama || '-'}, lalu unggah bukti transfer di aplikasi.`);
  else baris.push('', 'Pembayaran dapat dilakukan lewat aplikasi atau langsung kepada bendahara.');
  baris.push('', 'Abaikan pesan ini bila sudah membayar. Terima kasih atas kerja samanya.');
  return baris.join('\n');
}

// Sama dengan waLink di phone.js; ditulis ulang agar berkas ini bebas dari klien Supabase (bisa diuji di Node).
const waLink = (hp, text) => `https://wa.me/${hp}?text=${encodeURIComponent(text)}`;

/** Tautan WhatsApp berisi pesan pengingat; null bila nomor HP tidak tersedia. */
export const tautanPengingat = (t, p) => (t.nomor_hp ? waLink(t.nomor_hp, pesanTunggakan(t, p)) : null);

/** Kolom ekspor CSV laporan tunggakan. */
export const KOLOM_TUNGGAKAN = [
  { key: 'kode', label: 'rumah' },
  { key: 'blok', label: 'blok' },
  { key: 'gang_nama', label: 'jalan' },
  { key: 'nama', label: 'penghuni' },
  { key: 'jumlah_bulan', label: 'bulan_menunggak' },
  { key: 'total', label: 'total_tunggakan' },
  { key: 'periode_tertua', label: 'sejak', nilai: (t) => String(t.periode_tertua || '').slice(0, 7) },
];

/** Ringkasan per blok untuk chip filter dan kartu statistik. */
export function ringkasTunggakan(rows) {
  const blok = {};
  let total = 0;
  for (const r of rows) {
    total += Number(r.total) || 0;
    const b = (blok[r.blok || '-'] ||= { rumah: 0, total: 0 });
    b.rumah += 1; b.total += Number(r.total) || 0;
  }
  return { rumah: rows.length, total, blok };
}
