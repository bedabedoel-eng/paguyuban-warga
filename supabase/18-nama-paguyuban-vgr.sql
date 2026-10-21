-- =====================================================================
-- 18 — Nama paguyuban: "Paguyuban Vila Gading Royal"
-- Aman dijalankan ulang. Tidak menghapus data.
--  - Nama bawaan untuk instalasi baru diganti.
--  - Nama yang tersimpan hanya diganti bila MASIH nama bawaan lama
--    ("Paguyuban Warga Digital"); nama yang sudah Anda ubah sendiri tidak disentuh.
-- =====================================================================
alter table public.pengaturan
  alter column nama_paguyuban set default 'Paguyuban Vila Gading Royal';

update public.pengaturan
   set nama_paguyuban = 'Paguyuban Vila Gading Royal'
 where nama_paguyuban = 'Paguyuban Warga Digital';
