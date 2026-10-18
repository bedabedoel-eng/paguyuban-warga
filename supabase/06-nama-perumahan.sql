-- =====================================================================
-- 06 - Nama & alamat perumahan
-- Untuk database yang sudah berjalan. Aman dijalankan berulang.
-- RT/RW, tarif, rekening, dan pengaturan lain tidak disentuh.
-- (Instalasi baru sudah memakai nilai ini lewat 01 dan 02.)
-- =====================================================================
update public.pengaturan set
  nama_lingkungan = 'Perumahan Vila Gading Royal',
  alamat          = 'Desa Pamegarsari, Kec. Parung, Kab. Bogor'
where id = 1;
