-- =====================================================================
-- Data awal. Jalankan setelah 01-skema.sql. Sesuaikan isinya dengan
-- lingkungan Anda (boleh juga diubah nanti lewat menu Admin di aplikasi).
-- =====================================================================

-- Profil paguyuban
update public.pengaturan set
  nama_paguyuban  = 'Paguyuban Warga Digital',
  tagline         = 'Bersama Membangun Lingkungan yang Lebih Baik',
  nama_lingkungan = 'Perumahan Vila Gading Royal',
  rt = '', rw = '',                            -- isi RT/RW di menu Pengaturan paguyuban bila ada
  alamat = 'Desa Pamegarsari, Kec. Parung, Kab. Bogor',
  luas_wilayah = '2,5 Ha',
  latitude = -6.4310, longitude = 106.7290,   -- untuk widget cuaca
  tarif_ipl = 70000,
  jatuh_tempo_hari = 10,
  bank_nama = 'BCA',
  bank_norek = '1234 5678 9010',
  bank_atas_nama = 'Paguyuban Warga'
where id = 1;

-- Daftar blok
insert into public.blok (kode, nama, urutan) values
  ('A', 'Blok A', 1), ('B', 'Blok B', 2), ('C', 'Blok C', 3), ('D', 'Blok D', 4)
on conflict (kode) do nothing;

-- Kontak darurat (ganti dengan nomor yang benar)
insert into public.kontak_darurat (nama, nomor, keterangan, urutan)
select * from (values
  ('Pos Satpam', '0812 0000 0001', 'Siaga 24 jam', 1),
  ('Ketua RT', '0812 0000 0002', 'Urusan lingkungan', 2),
  ('Polisi', '110', 'Darurat kepolisian', 3),
  ('Ambulans', '118', 'Darurat medis', 4),
  ('Pemadam Kebakaran', '113', 'Kebakaran', 5)
) as v(nama, nomor, keterangan, urutan)
where not exists (select 1 from public.kontak_darurat);
