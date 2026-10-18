// Data contoh untuk pengujian tampilan (bukan data asli).
const now = new Date();
const iso = (d) => d.toISOString();
const hari = (n, h = 9) => { const d = new Date(now); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d; };
const tgl = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const awal = (offset = 0) => { const d = new Date(now.getFullYear(), now.getMonth() + offset, 1); return tgl(d); };

export const BLOK = [
  { kode: 'A', nama: 'Blok A', urutan: 1 }, { kode: 'B', nama: 'Blok B', urutan: 2 },
  { kode: 'C', nama: 'Blok C', urutan: 3 }, { kode: 'D', nama: 'Blok D', urutan: 4 },
];
// Satu blok berisi beberapa gang / jalan
export const GANG = [
  ['g-melati', 'Jl. Melati', 'A'], ['g-mawar', 'Jl. Mawar', 'A'], ['g-kenanga', 'Jl. Kenanga', 'B'],
  ['g-zamrud', 'Jl. Zamrud', 'C'], ['g-safir', 'Jl. Safir', 'C'], ['g-cempaka', 'Jl. Cempaka', 'D'],
].map(([id, nama, blok], i) => ({ id, nama, blok, urutan: i + 1, created_at: new Date().toISOString() }));

export const PENGATURAN = {
  id: 1, nama_paguyuban: 'Paguyuban Warga Digital', tagline: 'Rukun, terbuka, dan saling menjaga',
  nama_lingkungan: 'Perumahan Vila Gading Royal', rt: '', rw: '', alamat: 'Desa Pamegarsari, Kec. Parung, Kab. Bogor',
  luas_wilayah: '3,2 Ha', latitude: null, longitude: null, tarif_ipl: 75000, jatuh_tempo_hari: 10,
  bank_nama: 'BSI', bank_norek: '7123 4567 89', bank_atas_nama: 'Paguyuban Vila Gading Royal', foto_lingkungan: null,
  batas_persetujuan: 1000000,
};

const W = [
  ['u-ketua', 'Hendra Wijaya', 'B', '7', 'g-kenanga', 'Wiraswasta', 'pengurus'],
  ['u-wakil', 'Siti Rahmawati', 'A', '3', 'g-mawar', 'Guru SD', 'pengurus'],
  ['u-sekretaris', 'Dimas Pratama', 'C', '1/11', 'g-safir', 'Staf administrasi', 'pengurus'],
  ['u-bendahara', 'Ratna Kusumawardani', 'D', '2', 'g-cempaka', 'Akuntan', 'pengurus'],
  ['u-humas', 'Agus Setiawan', 'C', '3/9', 'g-zamrud', 'Teknisi listrik', 'pengurus'],
  ['u-admin', 'Yusuf Maulana', 'B', '1', 'g-kenanga', 'Programmer', 'admin'],
  ['u-warga', 'Budi Santoso', 'C', '3/5', 'g-zamrud', 'Pegawai swasta', 'warga'],
  ['w-01', 'Lestari Handayani', 'C', '3/2', 'g-zamrud', 'Perawat', 'warga'],
  ['w-02', 'Rudi Hartono', 'C', '3/8', 'g-zamrud', 'Pengemudi ojek daring', 'warga'],
  ['w-03', 'Maya Puspitasari', 'B', '4', 'g-kenanga', 'Desainer', 'warga'],
  ['w-04', 'Fajar Nugroho', 'C', '1/4', 'g-safir', 'Polisi', 'warga'],
  ['w-05', 'Wulan Sari', 'A', '6', 'g-melati', 'Pedagang', 'warga'],
  ['w-06', 'Bambang Irawan', 'A', '2', 'g-melati', 'Pensiunan PNS', 'warga'],
  ['w-07', 'Nur Aisyah', 'D', '8', 'g-cempaka', 'Dokter gigi', 'warga'],
  ['w-08', 'Eko Prasetyo', 'D', '5', null, 'Montir', 'warga'],
];
export const WARGA = W.map(([id, nama, blok, no, gang_id, pekerjaan, role], i) => ({
  id, nama, blok, no_rumah: no, gang_id, rumah_id: `r-${blok}${no}`, kepala_keluarga: i % 4 !== 3, pekerjaan,
  hobi: i % 3 === 0 ? 'Bulu tangkis, berkebun' : null, keluarga: i % 2 ? 'Istri dan 2 anak' : null,
  tentang: i === 0 ? 'Senang bergotong royong. Ketua paguyuban periode 2025–2027.' : null, foto_path: i % 3 === 2 ? null : `contoh/foto-${i}.jpg`, role,
  status: 'aktif', alasan_status: null, bergabung_at: iso(hari(-400 + i * 20)), created_at: iso(hari(-400 + i * 20)),
  pref_notifikasi: { ipl: true, pengumuman: true, kegiatan: true, laporan: true }, wajib_ganti_pin: i === 13,
}));
WARGA.push(
  { ...WARGA[7], id: 'p-01', nama: 'Andi Firmansyah', blok: 'C', no_rumah: '3/14', gang_id: 'g-zamrud', rumah_id: null, status: 'menunggu', role: 'warga', created_at: iso(hari(-1)), bergabung_at: null },
  { ...WARGA[7], id: 'p-02', nama: 'Sri Mulyani', blok: 'A', no_rumah: '15', gang_id: null, rumah_id: null, status: 'menunggu', role: 'warga', created_at: iso(hari(-3)), bergabung_at: null },
);
export const KONTAK = WARGA.map((w, i) => ({ warga_id: w.id, nomor_hp: `62812${String(30000000 + i * 1371).padStart(8, '0')}`, email: i === 0 ? 'hendra@contoh.id' : null, tampilkan_hp: i % 3 !== 2, tampilkan_email: false }));

export const PENGURUS = [
  ['j-1', 'u-ketua', 'Ketua', 'ketua', null, 1],
  ['j-2', 'u-wakil', 'Wakil Ketua', 'wakil_ketua', null, 2],
  ['j-3', 'u-sekretaris', 'Sekretaris', 'sekretaris', null, 3],
  ['j-4', 'u-bendahara', 'Bendahara', 'bendahara', null, 4],
  ['j-5', 'u-humas', 'Humas Jl. Zamrud', 'humas', 'g-zamrud', 10],
  ['j-6', 'w-04', 'Humas', 'humas', 'g-safir', 10],
  ['j-7', 'w-06', 'Seksi Keamanan', 'seksi', null, 20],
].map(([id, warga_id, jabatan, peran, wilayah_gang, urutan]) => ({
  id, warga_id, jabatan, peran, wilayah_gang, urutan, inti: urutan < 10, aktif: true, periode_mulai: 2025, periode_selesai: 2027, created_at: iso(hari(-300)),
  warga: (({ id: wid, nama, blok, no_rumah, gang_id, foto_path }) => ({ id: wid, nama, blok, no_rumah, gang_id, foto_path }))(WARGA.find((w) => w.id === warga_id)),
}));

export const RUMAH = WARGA.filter((w) => w.rumah_id).map((w) => ({ id: w.rumah_id, blok: w.blok, nomor: w.no_rumah, kode: `${w.blok}-${w.no_rumah}`, status: 'dihuni', tarif_ipl: w.blok === 'D' && w.no_rumah === '2' ? 90000 : null, catatan: null, created_at: iso(hari(-400)) }));
RUMAH.push({ id: 'r-C20', blok: 'C', nomor: '2/20', kode: 'C-2/20', status: 'kosong', tarif_ipl: null, catatan: null, created_at: iso(hari(-200)) });

export const TAGIHAN = [];
RUMAH.filter((r) => r.status === 'dihuni').forEach((r, i) => {
  for (let m = -5; m <= 0; m++) {
    const per = awal(m);
    let status = 'lunas';
    if (m === 0) status = i % 3 === 0 ? 'belum_bayar' : i % 3 === 1 ? 'lunas' : 'menunggu_verifikasi';
    if (m === -1 && i % 5 === 0) status = 'belum_bayar';
    if (r.id === 'r-C3/5') status = m >= -1 ? 'belum_bayar' : 'lunas';
    TAGIHAN.push({ id: `t-${r.id}-${m}`, rumah_id: r.id, periode: per, nominal: r.tarif_ipl || 75000, status, jatuh_tempo: per.slice(0, 8) + '10', dibayar_at: status === 'lunas' ? iso(hari(m * 30 - 3)) : null, metode: status === 'lunas' ? (i % 4 ? 'transfer' : 'tunai') : null, pembayaran_id: status === 'menunggu_verifikasi' ? `pb-${r.id}` : null, created_at: iso(hari(m * 30)), rumah: { kode: r.kode, blok: r.blok, nomor: r.nomor } });
  }
});
export const PEMBAYARAN = TAGIHAN.filter((t) => t.status === 'menunggu_verifikasi').map((t) => {
  const w = WARGA.find((x) => x.rumah_id === t.rumah_id);
  return { id: t.pembayaran_id, warga_id: w.id, rumah_id: t.rumah_id, jumlah: t.nominal, bukti_path: 'ipl/x/bukti.jpg', catatan: t.rumah_id === 'r-B4' ? 'Transfer dari rekening suami' : null, status: 'menunggu', created_at: iso(hari(-1, 20)), rumah: { kode: t.rumah.kode }, warga: { nama: w.nama } };
});

export const KAS = [
  ['k1', 'pemasukan', 'Saldo Awal', 8500000, -150, 'Saldo awal periode kepengurusan', 'manual', 'disetujui'],
  ['k2', 'pemasukan', 'Iuran IPL', 975000, -40, 'IPL bulan lalu (13 rumah)', 'ipl', 'disetujui'],
  ['k3', 'pengeluaran', 'Kebersihan', 600000, -35, 'Honor petugas sampah', 'manual', 'disetujui'],
  ['k4', 'pengeluaran', 'Keamanan', 1500000, -33, 'Honor satpam malam', 'manual', 'disetujui'],
  ['k5', 'pemasukan', 'Donasi', 500000, -20, 'Donasi keluarga Bpk. Fajar untuk 17-an', 'manual', 'disetujui'],
  ['k6', 'pengeluaran', 'Listrik & Air', 320000, -12, 'Listrik pos ronda & lampu jalan', 'manual', 'disetujui'],
  ['k7', 'pemasukan', 'Iuran IPL', 600000, -5, 'IPL bulan ini (8 rumah)', 'ipl', 'disetujui'],
  ['k8', 'pengeluaran', 'Perbaikan', 2400000, -1, 'Perbaikan portal Jl. Kenanga (las + cat)', 'manual', 'menunggu'],
  ['k9', 'pengeluaran', 'Kegiatan', 1250000, -2, 'Konsumsi rapat warga tahunan', 'manual', 'ditolak'],
].map(([id, jenis, kategori, jumlah, d, keterangan, sumber, status]) => ({
  id, jenis, kategori, jumlah, tanggal: tgl(hari(d)), keterangan, sumber, status, bukti_path: null, created_at: iso(hari(d)),
  dibuat_oleh: 'u-bendahara', pencatat: { nama: 'Ratna Kusumawardani' }, disetujui_oleh: status === 'menunggu' ? null : status === 'ditolak' ? 'u-ketua' : 'u-bendahara',
  disetujui_at: status === 'menunggu' ? null : iso(hari(d)), penyetuju: status === 'ditolak' ? { nama: 'Hendra Wijaya' } : { nama: 'Ratna Kusumawardani' },
  alasan_tolak: status === 'ditolak' ? 'Minta perbandingan harga dari dua katering' : null,
}));

export const PENGUMUMAN = [
  ['pg1', 'Kerja bakti bersih saluran air sebelum musim hujan', 'Minggu pagi pukul 07.00, kumpul di pos ronda masing-masing gang.', 'penting', null, true, -1],
  ['pg2', 'Jadwal pengambilan sampah berubah mulai pekan depan', 'Truk sampah datang Selasa dan Jumat pukul 06.00.', 'info', null, false, -3],
  ['pg3', 'Perbaikan lampu Jl. Zamrud', 'Lampu jalan depan No. 3/5–3/9 diperbaiki Kamis, listrik padam 1 jam.', 'info', 'g:g-zamrud', false, -4],
  ['pg5', 'Pemadaman air Blok C', 'PDAM memperbaiki pipa utama Blok C hari Sabtu 08.00–12.00.', 'penting', 'b:C', false, -2],
  ['pg4', 'Lomba 17 Agustus: pendaftaran panitia dibuka', 'Warga yang ingin menjadi panitia silakan mendaftar ke sekretaris.', 'kegiatan', null, false, -9],
].map(([id, judul, ringkasan, kategori, sas, disematkan, d]) => ({ id, judul, ringkasan, blok: sas?.startsWith('b:') ? sas.slice(2) : null, gang_id: sas?.startsWith('g:') ? sas.slice(2) : null, isi: `${ringkasan}\n\nMohon setiap rumah mengirimkan minimal satu perwakilan. Alat kebersihan disediakan pengurus; warga diharapkan membawa sarung tangan sendiri.\n\nTerima kasih atas partisipasinya.`, kategori, disematkan, gambar_path: null, dibuat_oleh: 'u-sekretaris', penulis: { nama: 'Dimas Pratama' }, created_at: iso(hari(d)), updated_at: iso(hari(d)) }));

export const KEGIATAN = [
  ['kg1', 'Kerja bakti bersih saluran', 'Pos ronda tiap gang', 2, 7, 10, null, true, null],
  ['kg2', 'Senam pagi bersama', 'Lapangan Blok B', 5, 6, 8, null, true, 40],
  ['kg3', 'Ronda malam Jl. Zamrud', 'Pos ronda Jl. Zamrud', 1, 21, 23, 'g-zamrud', true, 6],
  ['kg4', 'Rapat warga tahunan', 'Balai warga', 12, 19, 21, null, false, null],
  ['kg5', 'Posyandu balita', 'Rumah Bu Lestari (C-3/2)', -6, 8, 11, null, false, null],
].map(([id, judul, lokasi, d, h1, h2, gang_id, perlu_daftar, kuota]) => ({
  id, judul, lokasi, gang_id, blok: null, deskripsi: 'Mohon hadir tepat waktu. Penanggung jawab: Seksi Acara. Hubungi humas gang bila berhalangan.', mulai: iso(hari(d, h1)), selesai: iso(hari(d, h2)), perlu_daftar, kuota, gambar_path: null, dibuat_oleh: 'u-sekretaris', created_at: iso(hari(-10)),
  peserta: perlu_daftar ? WARGA.slice(0, (id.charCodeAt(2) % 5) + 2).map((w) => ({ warga_id: w.id, warga: { nama: w.nama, foto_path: null, blok: w.blok, no_rumah: w.no_rumah, gang_id: w.gang_id } })) : [],
}));

export const LAPORAN = [
  ['l1', 'lampu_jalan', 'Lampu jalan depan No. 12 mati', 'Sudah tiga malam gelap total, rawan untuk anak-anak.', 'baru', null, 'u-warga', -1],
  ['l2', 'sampah', 'Sampah menumpuk di ujung Jl. Zamrud', 'Bak sampah penuh sejak Senin, bau sampai ke rumah No. 5.', 'diproses', 'Sudah dikoordinasikan dengan petugas, diangkut Jumat.', 'w-01', -3],
  ['l3', 'usulan_kegiatan', 'Usul jadwal bank sampah bulanan', 'Bagaimana kalau tiap Minggu kedua ada bank sampah di balai warga?', 'baru', null, 'w-03', -2],
  ['l4', 'keamanan', 'Portal Jl. Kenanga tidak bisa dikunci', 'Gembok portal rusak, mohon diganti.', 'selesai', 'Gembok sudah diganti, kunci cadangan di pos satpam.', 'w-04', -12],
].map(([id, kategori, judul, deskripsi, status, tanggapan, pelapor_id, d]) => {
  const p = WARGA.find((w) => w.id === pelapor_id);
  return { id, kategori, judul, deskripsi, status, tanggapan, pelapor_id, foto_path: null, created_at: iso(hari(d)), updated_at: iso(hari(d)), pelapor: { nama: p.nama, blok: p.blok, no_rumah: p.no_rumah, gang_id: p.gang_id, foto_path: null } };
});

export const NOTIF = [
  ['n1', 'Tagihan IPL bulan ini terbit', 'Silakan bayar sebelum tanggal 10.', 'ipl', '/ipl', null, -1],
  ['n2', 'Pengumuman baru: Kerja bakti bersih saluran air', 'Minggu pagi pukul 07.00.', 'pengumuman', '/pengumuman/pg1', null, -1],
  ['n3', 'Persetujuan pengeluaran', 'Perbaikan · Rp 2400000 · Perbaikan portal Jl. Kenanga', 'keuangan', '/keuangan/persetujuan', null, -1],
  ['n4', 'Laporan Anda diproses', 'Sampah menumpuk · Sudah dikoordinasikan dengan petugas', 'laporan', '/aspirasi', iso(hari(-2)), -3],
  ['n5', 'Kegiatan mendatang: Senam pagi bersama', 'Lapangan Blok B', 'kegiatan', '/kegiatan/kg2', iso(hari(-4)), -5],
].map(([id, judul, isi, jenis, tautan, dibaca_at, d]) => ({ id, judul, isi, jenis, tautan, dibaca_at, created_at: iso(hari(d, 10)) }));

export const AKTIVITAS = [
  ['a1', 'u-bendahara', 'keuangan', 'mengajukan pengeluaran Perbaikan Rp 2.400.000', -1],
  ['a2', 'u-humas', 'anggota', 'menyetujui anggota Lestari Handayani', -2],
  ['a3', 'u-sekretaris', 'pengumuman', 'membuat pengumuman Kerja bakti bersih saluran air', -1],
  ['a4', 'u-sekretaris', 'administrasi', 'mengarsipkan notulen Rapat pengurus bulanan', -6],
  ['a5', 'u-bendahara', 'ipl', 'menerbitkan tagihan IPL bulan ini', -8],
].map(([id, pelaku_id, jenis, teks, d]) => ({ id, pelaku_id, jenis, teks, publik: true, created_at: iso(hari(d, 15)), pelaku: { nama: WARGA.find((w) => w.id === pelaku_id).nama } }));

export const DOKUMEN = [
  ['d1', 'notulen', '05/NOT/PW/2026', 'Rapat pengurus bulanan', -6, 'Seluruh pengurus inti dan humas gang', true],
  ['d2', 'surat_keluar', '012/PW/X/2026', 'Permohonan izin penutupan jalan untuk lomba 17-an', -15, 'Kelurahan Sukamaju', false],
  ['d3', 'surat_masuk', '470/123/Kel', 'Undangan sosialisasi pemilahan sampah', -20, 'Kelurahan Sukamaju', false],
].map(([id, jenis, nomor, judul, d, pihak, publik]) => ({ id, jenis, nomor, judul, tanggal: tgl(hari(d)), pihak, publik, isi: jenis === 'notulen' ? 'Agenda:\n1. Evaluasi IPL bulan lalu\n2. Rencana kerja bakti\n\nKeputusan:\n- Kerja bakti dilaksanakan Minggu depan.\n- Bendahara mengirim pengingat IPL ke rumah yang menunggak.' : 'Ringkasan isi surat.', lampiran_path: jenis === 'surat_masuk' ? 'dokumen/x/surat.pdf' : null, dibuat_oleh: 'u-sekretaris', pembuat: { nama: 'Dimas Pratama' }, created_at: iso(hari(d)), updated_at: iso(hari(d)) }));

export const DARURAT = [
  { id: 'e1', nama: 'Pos satpam', nomor: '0812 1111 2222', keterangan: 'Siaga 24 jam', urutan: 1 },
  { id: 'e2', nama: 'Ketua paguyuban', nomor: '0813 2222 3333', keterangan: 'Hendra Wijaya', urutan: 2 },
  { id: 'e3', nama: 'Polisi', nomor: '110', keterangan: 'Darurat kepolisian', urutan: 3 },
  { id: 'e4', nama: 'Ambulans', nomor: '118', keterangan: 'Darurat medis', urutan: 4 },
  { id: 'e5', nama: 'Pemadam kebakaran', nomor: '113', keterangan: 'Kebakaran', urutan: 5 },
];
