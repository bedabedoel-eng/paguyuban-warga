import { POLA_NOMOR_RUMAH, gangDiBlok, gangDariNomor, normalisasiAlamat } from './alamat.js';
import { normalizeHp } from './nomorHp.js';
import { pernahMenikah, PETA_HUNIAN } from './constants.js';
import { normalisasiLinkFoto } from './image.js';

/**
 * Pengolah berkas CSV import warga (logika murni, diuji di tests/unit/importWarga.test.js).
 * Server (fungsi import_warga) tetap memeriksa ulang semuanya.
 */
export const PETA_NIKAH = { 'belum menikah': 'belum_menikah', belum_menikah: 'belum_menikah', lajang: 'belum_menikah', 'belum kawin': 'belum_menikah', menikah: 'menikah', 'sudah menikah': 'menikah', kawin: 'menikah', 'cerai hidup': 'cerai_hidup', cerai_hidup: 'cerai_hidup', 'cerai mati': 'cerai_mati', cerai_mati: 'cerai_mati' };

export const ALIAS = {
  nama: ['nama', 'nama lengkap', 'name'],
  hp: ['hp', 'no hp', 'nomor hp', 'no_hp', 'nomor_hp', 'telepon', 'telp', 'wa', 'whatsapp'],
  blok: ['blok', 'block'],
  sub: ['sub_blok', 'sub blok', 'subblok', 'sub', 'kluster', 'cluster', 'klaster'],
  no_rumah: ['no_rumah', 'no rumah', 'nomor rumah', 'nomor_rumah', 'no', 'nomor'],
  rumah: ['rumah', 'blok_rumah', 'blok rumah', 'alamat', 'alamat rumah'],
  gang: ['jalan', 'gang', 'gang/jalan', 'gang / jalan', 'nama jalan', 'nama_jalan', 'jl'],
  pekerjaan: ['pekerjaan', 'keahlian', 'profesi'],
  kepala_keluarga: ['kepala_keluarga', 'kepala keluarga', 'kk'],
  status_pernikahan: ['status_pernikahan', 'status pernikahan', 'pernikahan', 'status nikah', 'status'],
  jumlah_anak: ['jumlah_anak', 'jumlah anak', 'anak'],
  status_hunian: ['status_hunian', 'status hunian', 'hunian', 'rumah ditempati', 'status rumah', 'kepemilikan'],
  foto: ['foto', 'link foto', 'link_foto', 'url foto', 'tautan foto', 'pas foto', 'pas_foto'],
};

export function petaKolom(header) {
  const norm = header.map((h) => String(h).trim().toLowerCase());
  const idx = {};
  for (const [k, names] of Object.entries(ALIAS)) idx[k] = norm.findIndex((h) => names.includes(h));
  return idx;
}

/** Ubah baris CSV menjadi objek, lalu validasi di sisi aplikasi (server memeriksa ulang). */
export function olahBaris(rows, blokKode, gang = []) {
  const [header, ...data] = rows;
  const idx = petaKolom(header);
  const wajib = ['nama', 'hp'];
  const kurang = wajib.filter((k) => idx[k] < 0);
  if (idx.blok < 0 && idx.rumah < 0) kurang.push('blok');
  if (idx.no_rumah < 0 && idx.rumah < 0) kurang.push('no_rumah');
  if (kurang.length) return { kurang, list: [] };
  const sudah = new Set();
  const list = data.map((r, n) => {
    const ambil = (k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
    // Blok "A3" + nomor "5", "Blok A 3 No.5", "A3-5", dst. dinormalkan menjadi blok A, sub-blok 3, nomor 5
    const al = normalisasiAlamat({ blok: ambil('blok'), sub: ambil('sub'), no: ambil('no_rumah'), rumah: ambil('rumah') }, blokKode);
    const { blok, sub, nomor } = al;
    const no = al.no_rumah;
    const hp = normalizeHp(ambil('hp'));
    const nama = ambil('nama');
    const namaGang = ambil('gang');
    let g = namaGang ? gangDiBlok(gang, blok).find((x) => x.nama.trim().toLowerCase() === namaGang.toLowerCase()) : null;
    if (!namaGang && !g && blokKode.includes(blok) && POLA_NOMOR_RUMAH.test(no)) g = gangDariNomor(gang, blok, no);
    const nikahMentah = ambil('status_pernikahan').toLowerCase();
    const nikah = nikahMentah ? PETA_NIKAH[nikahMentah] || '?' : '';
    const anak = ambil('jumlah_anak');
    const hunianMentah = ambil('status_hunian').toLowerCase();
    const hunian = hunianMentah ? PETA_HUNIAN[hunianMentah] || '?' : '';
    let foto = '';
    let galatFoto = '';
    try { foto = normalisasiLinkFoto(ambil('foto')); } catch (e) { galatFoto = e.message; }
    let galat = '';
    if (nama.length < 2) galat = 'Nama kosong/terlalu pendek';
    else if (!hp) galat = 'Nomor HP tidak valid';
    else if (!blokKode.includes(blok)) galat = `Blok "${blok || '-'}" tidak dikenal`;
    else if (!nomor) galat = 'Nomor rumah kosong';
    else if (!POLA_NOMOR_RUMAH.test(no)) galat = 'Nomor rumah tidak valid (maks. 10 karakter termasuk sub-blok)';
    else if (namaGang && !g) galat = `Jalan "${namaGang}" belum ada di Blok ${blok}`;
    else if (sudah.has(hp)) galat = 'Nomor HP ganda di berkas';
    else if (nikah === '?') galat = `Status pernikahan "${nikahMentah}" tidak dikenal`;
    else if (anak && (!/^\d{1,2}$/.test(anak) || Number(anak) > 30)) galat = 'Jumlah anak: angka 0 sampai 30';
    else if (hunian === '?') galat = `Rumah ditempati "${hunianMentah}" tidak dikenal (isi milik sendiri atau kontrak)`;
    else if (galatFoto) galat = galatFoto;
    if (hp) sudah.add(hp);
    return { baris: n + 2, nama, hp, blok, sub_blok: sub, nomor, no_rumah: no, gang: g?.nama || '', pekerjaan: ambil('pekerjaan'), kepala_keluarga: ambil('kepala_keluarga'), status_pernikahan: nikah === '?' ? '' : nikah, jumlah_anak: pernahMenikah(nikah) ? anak : '', status_hunian: hunian === '?' ? '' : hunian, foto, galat };
  });
  return { kurang: [], list };
}
