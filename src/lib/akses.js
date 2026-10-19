/**
 * Model peran & hak akses paguyuban (cermin fungsi hak_saya() di database).
 * Database tetap penjaga utama (RLS); berkas ini hanya mengatur tampilan.
 */

export const PERAN_PENGURUS = {
  ketua: { label: 'Ketua', urut: 1, inti: true, ringkas: 'Pengawasan menyeluruh dan persetujuan keputusan penting' },
  wakil_ketua: { label: 'Wakil Ketua', urut: 2, inti: true, ringkas: 'Membantu ketua: anggota, informasi, aspirasi' },
  sekretaris: { label: 'Sekretaris', urut: 3, inti: true, ringkas: 'Data anggota, surat, agenda, notulen' },
  bendahara: { label: 'Bendahara', urut: 4, inti: true, ringkas: 'Iuran, pemasukan, pengeluaran, laporan kas' },
  humas: { label: 'Humas Jalan', urut: 5, inti: false, ringkas: 'Informasi, anggota, dan aspirasi di jalan yang dipegang' },
  seksi: { label: 'Seksi / Anggota Pengurus', urut: 6, inti: false, ringkas: 'Membantu kegiatan sesuai bidang' },
};

export const HAK_KOSONG = {
  aktif: false, pengurus: false, admin: false, bendahara: false, ketua: false, pimpinan: false, sekretaris: false,
  humas: false, wilayah: [], peran: [], kelola_anggota: false, kelola_info: false, kelola_laporan: false,
  kelola_dokumen: false, kelola_pengurus: false, setujui_kas: false, lihat_kas_detail: false,
  // Wilayah blok pengurus (migrasi 07): ['*'] = semua blok, atau daftar kode blok. null = database belum dimigrasi.
  ipl_blok: null, info_blok: null,
};

/** Normalisasi hasil hak_saya() (database versi lama belum punya kunci baru). */
export function normalHak(h) {
  const x = { ...HAK_KOSONG, ...(h || {}) };
  x.wilayah = Array.isArray(x.wilayah) ? x.wilayah : [];
  x.peran = Array.isArray(x.peran) ? x.peran : [];
  // Kompatibilitas: database tanpa migrasi 05 -> pengurus = pengelola umum
  if (h && h.kelola_info === undefined && x.pengurus) {
    Object.assign(x, { kelola_anggota: true, kelola_info: true, kelola_laporan: true, kelola_dokumen: false, kelola_pengurus: x.admin, setujui_kas: x.admin, lihat_kas_detail: x.bendahara, pimpinan: x.admin });
  }
  return x;
}

/** Label peran utama untuk ditampilkan (mis. "Ketua", "Humas Jl. Zamrud", "Warga"). */
export function labelPeran(hak, jabatan, gang = []) {
  if (jabatan) return jabatan;
  const p = [...(hak?.peran || [])].sort((a, b) => (PERAN_PENGURUS[a]?.urut ?? 9) - (PERAN_PENGURUS[b]?.urut ?? 9))[0];
  if (p === 'humas' && hak.wilayah?.length) {
    const nama = hak.wilayah.map((id) => gang.find((g) => g.id === id)?.nama).filter(Boolean);
    return nama.length ? `Humas ${nama.join(', ')}` : PERAN_PENGURUS.humas.label;
  }
  if (p) return PERAN_PENGURUS[p].label;
  if (hak?.admin) return 'Admin';
  return 'Warga';
}

/** Nama jalan yang dipegang humas, mis. "Jl. Zamrud, Jl. Safir". */
export function namaWilayah(hak, gang = []) {
  return (hak?.wilayah || []).map((id) => gang.find((g) => g.id === id)?.nama).filter(Boolean).join(', ') || 'jalan Anda';
}

/** Apakah pengguna boleh mengelola data warga / informasi di gang tertentu (null = tanpa gang/semua). */
export function kelolaWilayah(hak, gangId) {
  return hak.kelola_anggota || (!!gangId && hak.wilayah.includes(gangId));
}

/**
 * Pilihan sasaran pengumuman/kegiatan.
 * Nilai: '' = semua warga, 'b:C' = satu blok, 'g:<id>' = satu jalan.
 * Humas hanya bisa memilih jalannya sendiri.
 */
export function opsiSasaran(hak, blok = [], gang = []) {
  const { semua, blok: blokBoleh } = lingkupBlok(hak.info_blok, !!hak.kelola_anggota);
  const bolehGang = (g) => semua || hak.wilayah.includes(g.id) || (!!g.blok && blokBoleh.includes(g.blok));
  const opsi = [];
  if (semua) opsi.push({ value: '', tipe: 'semua', label: 'Semua warga' });
  for (const b of blok) {
    if (!semua && !blokBoleh.includes(b.kode)) continue;
    const nama = /^blok\s/i.test(b.nama || '') ? b.nama : `Blok ${b.kode}${b.nama && b.nama !== b.kode ? ` (${b.nama})` : ''}`;
    opsi.push({ value: `b:${b.kode}`, tipe: 'blok', label: nama });
  }
  for (const g of gang.filter(bolehGang)) opsi.push({ value: `g:${g.id}`, tipe: 'jalan', label: `${g.nama}${g.blok ? ` (Blok ${g.blok})` : ' (lintas blok)'}` });
  return opsi;
}

/**
 * Wilayah blok dari hak_saya(): { semua, blok[] }.
 * list = null berarti database belum dimigrasi (07); pakai nilai bawaan.
 */
export function lingkupBlok(list, bawaan = false) {
  if (!Array.isArray(list)) return { semua: bawaan, blok: [] };
  return { semua: list.includes('*'), blok: list.filter((b) => b !== '*') };
}

/** "Semua blok" atau "Blok C, D" dari daftar wilayah blok. */
export function labelLingkupBlok(list) {
  const { semua, blok } = lingkupBlok(list, true);
  return semua || !blok.length ? 'Semua blok' : `Blok ${blok.join(', ')}`;
}

/** Boleh mengubah/menghapus pengumuman atau kegiatan ini? (sasaran: blok atau jalan) */
export function kelolaInfo(hak, x, gang = []) {
  if (!x) return false;
  if (x.gang_id && hak.wilayah.includes(x.gang_id)) return true;
  const { semua, blok } = lingkupBlok(hak.info_blok, !!hak.kelola_anggota);
  if (semua) return true;
  const b = x.blok || gang.find((g) => g.id === x.gang_id)?.blok;
  return !!b && blok.includes(b);
}

/** Nilai pilihan sasaran dari baris pengumuman/kegiatan. */
export const nilaiSasaran = (x) => (x?.gang_id ? `g:${x.gang_id}` : x?.blok ? `b:${x.blok}` : '');

/** Kolom database dari nilai pilihan sasaran. */
export function kolomSasaran(v) {
  if (v?.startsWith('g:')) return { gang_id: v.slice(2), blok: null };
  if (v?.startsWith('b:')) return { blok: v.slice(2), gang_id: null };
  return { blok: null, gang_id: null };
}

/** Ringkasan matriks hak (ditampilkan di halaman Pengurus). */
export const MATRIKS = [
  { aksi: 'Lihat semua data & laporan', ketua: true, wakil_ketua: true, sekretaris: 'Anggota & arsip', bendahara: 'Keuangan', humas: 'Jalannya' },
  { aksi: 'Verifikasi & ubah data anggota', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: false, humas: 'Jalannya' },
  { aksi: 'Pengumuman & kegiatan', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: false, humas: 'Jalannya' },
  { aksi: 'Tanggapi aspirasi warga', ketua: true, wakil_ketua: true, sekretaris: false, bendahara: false, humas: 'Jalannya' },
  { aksi: 'Surat, notulen & arsip', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: 'Baca', humas: 'Baca' },
  { aksi: 'Tagihan IPL & catat kas', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: true, humas: false },
  { aksi: 'Setujui pengeluaran besar', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: false, humas: false },
  { aksi: 'Angkat & atur pengurus', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: false, humas: false },
];

/** "Humas" + gang yang dipegang bila belum tertulis di jabatan, mis. "Humas · Jl. Zamrud". */
export function labelJabatan(p, namaGang = () => null) {
  const g = p?.peran === 'humas' && p.wilayah_gang ? namaGang(p.wilayah_gang) : null;
  if (!g || p.jabatan.toLowerCase().includes(g.toLowerCase())) return p.jabatan;
  return `${p.jabatan} · ${g}`;
}
