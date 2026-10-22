import { POLA_NOMOR_RUMAH, gangDiBlok, cariGang, normalisasiAlamat, pecahNomor } from './alamat.js';
import { normalizeHp, formatHp } from './nomorHp.js';
import { pernahMenikah, PETA_HUNIAN, STATUS_HUNIAN, STATUS_PERNIKAHAN, STATUS_WARGA } from './constants.js';
import { normalisasiLinkFoto } from './image.js';
import { ALIAS, PETA_NIKAH, olahBaris } from './importWarga.js';

/**
 * Import CSV satu pintu: tiap baris berkas dicocokkan ke warga yang sudah ada, lalu digolongkan menjadi
 *   baru   = belum terdaftar -> akun dibuat (fungsi import_warga, khusus admin)
 *   ubah   = sudah terdaftar dan ada kolom yang berbeda -> diperbarui (fungsi perbarui_warga_massal)
 *   sama   = sudah terdaftar, tidak ada yang berubah -> dilewati
 *   galat  = tidak bisa diproses (alasan di `galat`)
 * Pencocokan: kolom `id` (ada di hasil Ekspor CSV) lebih dulu, lalu nomor HP.
 * Aturan isi: kolom yang TIDAK ada di berkas tidak diubah. Sel kosong mengosongkan data opsional
 * (jalan, pekerjaan, pernikahan, jumlah anak, rumah ditempati); untuk nama, blok, dan nomor rumah sel kosong
 * adalah galat; untuk nomor HP, kepala keluarga, foto, dan keanggotaan sel kosong berarti tidak diubah.
 * Logika murni (diuji di tests/unit/perbaikanWarga.test.js). Server memeriksa ulang semuanya.
 */

export const ALIAS_PERBAIKAN = {
  ...ALIAS,
  id: ['id', 'id_warga', 'id warga', 'warga_id'],
  keanggotaan: ['keanggotaan', 'status_keanggotaan', 'status keanggotaan', 'status anggota', 'status_anggota'],
};

/** Label kolom untuk daftar perubahan. */
export const LABEL_KOLOM = {
  nama: 'Nama', hp: 'Nomor HP', blok: 'Blok', no_rumah: 'Nomor rumah', gang: 'Jalan', pekerjaan: 'Pekerjaan',
  kepala_keluarga: 'Kepala keluarga', status_pernikahan: 'Pernikahan', jumlah_anak: 'Jumlah anak',
  status_hunian: 'Rumah ditempati', foto: 'Tautan foto', status: 'Keanggotaan',
};

const PETA_KK = { ya: true, y: true, true: true, 1: true, kk: true, tidak: false, n: false, false: false, 0: false, bukan: false };

export function petaKolomPerbaikan(header) {
  const norm = header.map((h) => String(h).trim().toLowerCase());
  const idx = {};
  for (const [k, names] of Object.entries(ALIAS_PERBAIKAN)) idx[k] = norm.findIndex((h) => names.includes(h));
  // Ekspor lama memakai kolom "status" untuk keanggotaan, di samping "status_pernikahan"
  if (idx.keanggotaan < 0 && idx.status_pernikahan >= 0) {
    const s = norm.findIndex((h, i) => h === 'status' && i !== idx.status_pernikahan);
    if (s >= 0) idx.keanggotaan = s;
  }
  return idx;
}

const kosongJadiNull = (v) => (v === '' || v === undefined ? null : v);
const tampil = {
  hp: (v) => (v ? formatHp(v) : ''),
  kepala_keluarga: (v) => (v ? 'ya' : 'tidak'),
  status_pernikahan: (v) => STATUS_PERNIKAHAN[v]?.label || '',
  status_hunian: (v) => STATUS_HUNIAN[v]?.label || '',
  status: (v) => STATUS_WARGA[v]?.label || v || '',
};
const teks = (k, v) => (v === null || v === undefined || v === '' ? '' : String(tampil[k] ? tampil[k](v) : v));

/**
 * Bandingkan isi berkas (hasil parseCsv: baris pertama = judul kolom) dengan data warga yang sudah dimuat.
 * opsi:
 *   warga      daftar warga (semuaWarga, dengan .kontak)
 *   blokKode   ['A', 'B', ...]
 *   gang       daftar jalan
 *   admin      boleh membuat akun, mengubah nomor HP dan foto
 *   uid        id pengguna yang sedang masuk
 *   bolehUbah(w)  kewenangan atas warga (wilayah); bawaan: selalu boleh
 * Hasil: { kurang: [pesan], list: [...], jumlah: { baru, ubah, sama, galat } }
 */
export function bandingkanCsv(rows, { warga = [], blokKode = [], gang = [], admin = false, uid = null, bolehUbah = () => true } = {}) {
  const [header = [], ...data] = rows;
  const idx = petaKolomPerbaikan(header);
  const ada = (k) => idx[k] >= 0;
  if (!ada('id') && !ada('hp')) {
    return { kurang: ['Berkas perlu kolom id (dari Ekspor CSV) atau hp untuk mencocokkan warga.'], list: [], jumlah: { baru: 0, ubah: 0, sama: 0, galat: 0 } };
  }
  const adaAlamat = ada('blok') || ada('no_rumah') || ada('rumah') || ada('sub');

  const byId = new Map(warga.map((w) => [String(w.id), w]));
  const byHp = new Map(warga.filter((w) => w.kontak?.nomor_hp).map((w) => [w.kontak.nomor_hp, w]));
  // Validasi akun baru memakai aturan Import yang sudah ada (indeks baris sama: data[n] <-> buat.list[n])
  const buat = olahBaris(rows, blokKode, gang);
  const kolomBaru = buat.kurang;

  const dipakai = new Map(); // id warga -> baris pertama yang memakainya
  const hpDiberkas = new Map(); // hp target -> baris
  const list = data.map((r, n) => {
    const baris = n + 2;
    // Ekspor menambah tanda kutip di depan nilai berawalan = + - @ (pengaman rumus Excel); dibuang lagi di sini
    const ambil = (k) => (ada(k) ? String(r[idx[k]] ?? '').trim().replace(/^'(?=[=+\-@])/, '') : '');
    const keluar = (jenis, extra) => ({ baris, jenis, nama: ambil('nama'), perubahan: [], catatan: [], ...extra });

    // 1. Cocokkan ke warga yang sudah ada
    const idTeks = ambil('id');
    const hpTeks = ambil('hp');
    const hp = hpTeks ? normalizeHp(hpTeks) : null;
    let w = null;
    if (idTeks) {
      w = byId.get(idTeks) || null;
      if (!w) return keluar('galat', { galat: 'Kolom id tidak cocok dengan warga mana pun (mungkin sudah dihapus atau di luar akses Anda). Kosongkan id untuk membuat akun baru.' });
    } else if (hp) {
      w = byHp.get(hp) || null;
    } else if (hpTeks) {
      return keluar('galat', { galat: 'Nomor HP tidak valid' });
    } else {
      return keluar('galat', { galat: 'Isi kolom id atau hp agar warga bisa dicocokkan' });
    }

    // 2. Belum terdaftar -> akun baru
    if (!w) {
      if (!admin) return keluar('galat', { galat: 'Warga belum terdaftar. Hanya admin yang bisa membuat akun baru.' });
      if (kolomBaru.length) return keluar('galat', { galat: `Warga belum terdaftar. Untuk membuat akun baru, berkas perlu kolom ${kolomBaru.join(', ')}.` });
      const b = buat.list[n];
      if (hpDiberkas.has(hp)) return keluar('galat', { galat: `Nomor HP sama dengan baris ${hpDiberkas.get(hp)}` });
      hpDiberkas.set(hp, baris);
      if (b.galat) return keluar('galat', { galat: b.galat, buat: b });
      return keluar('baru', { nama: b.nama, alamat: [b.blok, b.no_rumah].filter(Boolean).join('-'), buat: b });
    }

    // 3. Sudah terdaftar -> hitung perubahan
    const k = w.kontak || {};
    const dasar = { nama: w.nama, alamat: [w.blok, w.no_rumah].filter(Boolean).join('-'), warga: w };
    if (dipakai.has(w.id)) return keluar('galat', { ...dasar, galat: `Warga yang sama sudah ada di baris ${dipakai.get(w.id)}` });
    dipakai.set(w.id, baris);
    if (!bolehUbah(w)) return keluar('galat', { ...dasar, galat: 'Warga ini di luar wilayah kewenangan Anda' });
    if (!admin && w.id === uid) return keluar('galat', { ...dasar, galat: 'Data diri sendiri diubah lewat menu Profil' });
    if (!admin && w.role === 'admin') return keluar('galat', { ...dasar, galat: 'Data admin hanya dapat diubah admin' });

    const perubahan = [];
    const catatan = [];
    const patch = { id: w.id };
    const ubah = (kolom, lama, baru, kirim = baru) => {
      if ((lama ?? null) === (baru ?? null)) return;
      perubahan.push({ kolom, label: LABEL_KOLOM[kolom], lama: teks(kolom, lama), baru: teks(kolom, baru) });
      patch[kolom] = kirim ?? '';
    };
    const galat = (pesan) => keluar('galat', { ...dasar, galat: pesan });

    if (ada('nama')) {
      const nama = ambil('nama');
      if (nama.length < 2) return galat('Nama kosong atau terlalu pendek');
      ubah('nama', w.nama, nama.slice(0, 80));
    }

    // Alamat: kolom yang tidak ada memakai data sekarang
    let blok = w.blok || '';
    let noRumah = (w.no_rumah || '').toUpperCase();
    if (adaAlamat) {
      const sekarang = pecahNomor(w.no_rumah);
      const al = normalisasiAlamat({
        blok: ada('blok') ? ambil('blok') : (ada('rumah') && ambil('rumah') ? '' : w.blok || ''),
        sub: ada('sub') ? ambil('sub') : (ada('no_rumah') || ada('rumah') ? '' : sekarang.sub),
        no: ada('no_rumah') ? ambil('no_rumah') : (ada('rumah') && ambil('rumah') ? '' : (ada('sub') ? sekarang.nomor : w.no_rumah || '')),
        rumah: ambil('rumah'),
      }, blokKode);
      if (!al.blok) return galat('Blok kosong');
      if (!blokKode.includes(al.blok)) return galat(`Blok "${al.blok}" tidak dikenal`);
      if (!al.nomor) return galat('Nomor rumah kosong');
      if (!POLA_NOMOR_RUMAH.test(al.no_rumah)) return galat('Nomor rumah tidak valid (maks. 10 karakter termasuk sub-blok)');
      blok = al.blok; noRumah = al.no_rumah;
      if (blok !== (w.blok || '') || noRumah !== (w.no_rumah || '').toUpperCase()) {
        // blok dan nomor rumah selalu dikirim berpasangan
        ubah('blok', w.blok || null, blok);
        ubah('no_rumah', (w.no_rumah || '').toUpperCase() || null, noRumah);
        patch.blok = blok; patch.no_rumah = noRumah;
      }
    }

    // Jalan: dicocokkan dengan nama jalan di blok (baru) warga
    const gangLama = w.gang_id || null;
    if (ada('gang')) {
      const namaJalan = ambil('gang');
      let g = null;
      if (namaJalan) {
        g = gangDiBlok(gang, blok).find((x) => x.nama.trim().toLowerCase() === namaJalan.toLowerCase()) || null;
        if (!g) return galat(`Jalan "${namaJalan}" belum ada di Blok ${blok}`);
      }
      if ((g?.id || null) !== gangLama) {
        perubahan.push({ kolom: 'gang', label: LABEL_KOLOM.gang, lama: cariGang(gang, gangLama)?.nama || '', baru: g?.nama || '' });
        patch.gang = g?.nama || '';
      }
    } else if (blok !== (w.blok || '') && gangLama) {
      const g = cariGang(gang, gangLama);
      if (g?.blok && g.blok !== blok) {
        ubah('gang', g.nama, null, '');
        catatan.push('Jalan dikosongkan karena pindah blok');
      }
    }

    if (ada('pekerjaan')) ubah('pekerjaan', w.pekerjaan || null, kosongJadiNull(ambil('pekerjaan').slice(0, 60)), ambil('pekerjaan').slice(0, 60));
    if (ada('kepala_keluarga') && ambil('kepala_keluarga')) {
      const v = PETA_KK[ambil('kepala_keluarga').toLowerCase()];
      if (v === undefined) return galat('Kepala keluarga: isi ya atau tidak');
      ubah('kepala_keluarga', !!w.kepala_keluarga, v, v ? 'ya' : 'tidak');
    }

    let nikah = k.status_pernikahan || null;
    if (ada('status_pernikahan')) {
      const mentah = ambil('status_pernikahan').toLowerCase();
      const v = mentah ? PETA_NIKAH[mentah] : null;
      if (mentah && !v) return galat(`Status pernikahan "${mentah}" tidak dikenal`);
      nikah = v || null;
      ubah('status_pernikahan', k.status_pernikahan || null, nikah, nikah || '');
    }
    const anakLama = k.jumlah_anak ?? null;
    if (ada('jumlah_anak') || nikah !== (k.status_pernikahan || null)) {
      let anak = anakLama;
      if (ada('jumlah_anak')) {
        const t = ambil('jumlah_anak');
        if (t && (!/^\d{1,2}$/.test(t) || Number(t) > 30)) return galat('Jumlah anak: angka 0 sampai 30');
        anak = t === '' ? null : Number(t);
      }
      if (!pernahMenikah(nikah)) anak = null; // server juga mengosongkannya
      if (anak !== anakLama) ubah('jumlah_anak', anakLama, anak, anak === null ? '' : String(anak));
    }

    if (ada('status_hunian')) {
      const mentah = ambil('status_hunian').toLowerCase();
      const v = mentah ? PETA_HUNIAN[mentah] : null;
      if (mentah && !v) return galat(`Rumah ditempati "${mentah}" tidak dikenal (isi milik sendiri atau kontrak)`);
      ubah('status_hunian', k.status_hunian || null, v || null, v || '');
    }

    if (ada('keanggotaan') && ambil('keanggotaan')) {
      const v = ambil('keanggotaan').toLowerCase();
      if (v !== w.status) {
        if (!['aktif', 'nonaktif'].includes(v)) return galat('Keanggotaan hanya bisa diubah menjadi aktif atau nonaktif');
        if (!['aktif', 'nonaktif'].includes(w.status)) return galat('Pendaftar yang belum disetujui diproses lewat menu Verifikasi anggota');
        if (w.id === uid) return galat('Status akun sendiri tidak dapat diubah');
        ubah('status', w.status, v);
      }
    }

    // Nomor HP dan foto: khusus admin; selain admin perubahan dicatat lalu diabaikan
    if (hp && idTeks && hp !== (k.nomor_hp || null)) {
      const lain = byHp.get(hp);
      if (lain && lain.id !== w.id) return galat(`Nomor HP sudah dipakai ${lain.nama}`);
      if (hpDiberkas.has(hp)) return galat(`Nomor HP sama dengan baris ${hpDiberkas.get(hp)}`);
      if (admin) ubah('hp', k.nomor_hp || null, hp);
      else if (k.nomor_hp) catatan.push('Nomor HP hanya bisa diubah admin; perubahan nomor diabaikan');
    }
    if (hp) hpDiberkas.set(hp, baris);
    if (ada('foto') && ambil('foto')) {
      let foto;
      try { foto = normalisasiLinkFoto(ambil('foto')); } catch (e) { return galat(e.message); }
      if (foto !== (w.foto_path || '')) {
        if (admin) ubah('foto', /^https:/i.test(w.foto_path || '') ? w.foto_path : (w.foto_path ? '(foto tersimpan)' : null), foto);
        else catatan.push('Foto hanya bisa diubah admin; tautan foto diabaikan');
      }
    }

    return keluar(perubahan.length ? 'ubah' : 'sama', { ...dasar, perubahan, catatan, patch });
  });

  const jumlah = { baru: 0, ubah: 0, sama: 0, galat: 0 };
  for (const x of list) jumlah[x.jenis] += 1;
  return { kurang: [], list, jumlah };
}

/** Baris import_warga dari hasil olahBaris (dipakai saat membuat akun baru). */
export const barisBuat = ({ nama, hp, blok, no_rumah, gang, pekerjaan, kepala_keluarga, status_pernikahan, jumlah_anak, status_hunian, foto }) => ({
  nama, hp, blok, no_rumah, gang: gang || null, pekerjaan, kepala_keluarga,
  status_pernikahan: status_pernikahan || null, jumlah_anak: jumlah_anak || null, status_hunian: status_hunian || null, foto: foto || null,
});

/* ---------------------------------------------------------------------
 * Ubah massal dari tabel: satu kolom diisi nilai yang sama untuk banyak warga.
 * ------------------------------------------------------------------- */
export const KOLOM_MASSAL = [
  { value: 'gang', label: 'Jalan' },
  { value: 'status_hunian', label: 'Rumah ditempati' },
  { value: 'status_pernikahan', label: 'Status pernikahan' },
  { value: 'kepala_keluarga', label: 'Kepala keluarga' },
  { value: 'pekerjaan', label: 'Pekerjaan' },
];

/**
 * Susun patch perbarui_warga_massal untuk "Ubah massal".
 * nilai: id jalan / kode status / 'ya'|'tidak' / teks pekerjaan; '' = kosongkan.
 * Hasil: { patch: [...], sama: [warga], lewat: [{ w, alasan }] }
 */
export function patchMassal(daftar, kolom, nilai, { gang = [] } = {}) {
  const patch = []; const sama = []; const lewat = [];
  for (const w of daftar) {
    const k = w.kontak || {};
    if (kolom === 'gang') {
      const g = nilai ? cariGang(gang, nilai) : null;
      if (nilai && !g) { lewat.push({ w, alasan: 'Jalan tidak ditemukan' }); continue; }
      if (g?.blok && g.blok !== w.blok) { lewat.push({ w, alasan: `${g.nama} tidak ada di Blok ${w.blok || '-'}` }); continue; }
      if ((w.gang_id || null) === (g?.id || null)) sama.push(w); else patch.push({ id: w.id, gang: g?.nama || '' });
    } else if (kolom === 'status_hunian' || kolom === 'status_pernikahan') {
      if ((k[kolom] || '') === (nilai || '')) sama.push(w); else patch.push({ id: w.id, [kolom]: nilai || '' });
    } else if (kolom === 'kepala_keluarga') {
      const v = nilai === 'ya';
      if (!!w.kepala_keluarga === v) sama.push(w); else patch.push({ id: w.id, kepala_keluarga: v ? 'ya' : 'tidak' });
    } else if (kolom === 'pekerjaan') {
      const v = String(nilai || '').trim().slice(0, 60);
      if ((w.pekerjaan || '') === v) sama.push(w); else patch.push({ id: w.id, pekerjaan: v });
    } else {
      lewat.push({ w, alasan: 'Kolom tidak dikenal' });
    }
  }
  return { patch, sama, lewat };
}
