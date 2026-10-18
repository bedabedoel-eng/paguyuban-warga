/**
 * Model peran & hak akses paguyuban (cermin fungsi hak_saya() di database).
 * Database tetap penjaga utama (RLS); berkas ini hanya mengatur tampilan.
 */

export const PERAN_PENGURUS = {
  ketua: { label: 'Ketua', urut: 1, inti: true, ringkas: 'Pengawasan menyeluruh dan persetujuan keputusan penting' },
  wakil_ketua: { label: 'Wakil Ketua', urut: 2, inti: true, ringkas: 'Membantu ketua: anggota, informasi, aspirasi' },
  sekretaris: { label: 'Sekretaris', urut: 3, inti: true, ringkas: 'Data anggota, surat, agenda, notulen' },
  bendahara: { label: 'Bendahara', urut: 4, inti: true, ringkas: 'Iuran, pemasukan, pengeluaran, laporan kas' },
  humas: { label: 'Humas Gang', urut: 5, inti: false, ringkas: 'Informasi, anggota, dan aspirasi di gangnya' },
  seksi: { label: 'Seksi / Anggota Pengurus', urut: 6, inti: false, ringkas: 'Membantu kegiatan sesuai bidang' },
};

export const HAK_KOSONG = {
  aktif: false, pengurus: false, admin: false, bendahara: false, ketua: false, pimpinan: false, sekretaris: false,
  humas: false, wilayah: [], peran: [], kelola_anggota: false, kelola_info: false, kelola_laporan: false,
  kelola_dokumen: false, kelola_pengurus: false, setujui_kas: false, lihat_kas_detail: false,
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

/** Label peran utama untuk ditampilkan (mis. "Ketua", "Humas Gang A", "Warga"). */
export function labelPeran(hak, jabatan) {
  if (jabatan) return jabatan;
  const p = [...(hak?.peran || [])].sort((a, b) => (PERAN_PENGURUS[a]?.urut ?? 9) - (PERAN_PENGURUS[b]?.urut ?? 9))[0];
  if (p === 'humas' && hak.wilayah?.length) return `Humas Gang ${hak.wilayah.join(', ')}`;
  if (p) return PERAN_PENGURUS[p].label;
  if (hak?.admin) return 'Admin';
  return 'Warga';
}

/** Apakah pengguna boleh mengelola data di gang tertentu. */
export function kelolaWilayah(hak, blok) {
  return hak.kelola_anggota || (!!blok && hak.wilayah.includes(blok));
}

/** Gang yang bisa dipilih sebagai sasaran informasi. null = semua warga. */
export function opsiSasaran(hak, blok = []) {
  const semua = hak.kelola_anggota;
  const daftar = blok.filter((b) => semua || hak.wilayah.includes(b.kode)).map((b) => ({ value: b.kode, label: `Hanya ${b.nama}` }));
  return semua ? [{ value: '', label: 'Semua warga' }, ...daftar] : daftar;
}

/** Ringkasan matriks hak (ditampilkan di halaman Pengurus). */
export const MATRIKS = [
  { aksi: 'Lihat semua data & laporan', ketua: true, wakil_ketua: true, sekretaris: 'Anggota & arsip', bendahara: 'Keuangan', humas: 'Gangnya' },
  { aksi: 'Verifikasi & ubah data anggota', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: false, humas: 'Gangnya' },
  { aksi: 'Pengumuman & kegiatan', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: false, humas: 'Gangnya' },
  { aksi: 'Tanggapi aspirasi warga', ketua: true, wakil_ketua: true, sekretaris: false, bendahara: false, humas: 'Gangnya' },
  { aksi: 'Surat, notulen & arsip', ketua: true, wakil_ketua: true, sekretaris: true, bendahara: 'Baca', humas: 'Baca' },
  { aksi: 'Tagihan IPL & catat kas', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: true, humas: false },
  { aksi: 'Setujui pengeluaran besar', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: false, humas: false },
  { aksi: 'Angkat & atur pengurus', ketua: true, wakil_ketua: false, sekretaris: false, bendahara: false, humas: false },
];
