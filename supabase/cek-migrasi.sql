-- =====================================================================
-- cek-migrasi.sql - Melihat migrasi mana yang SUDAH terpasang di database ini (hanya membaca).
-- Jalankan di Supabase > SQL Editor. Hasil: satu baris per migrasi dengan kolom "terpasang".
--   ya                         = tanda khas migrasi itu ditemukan
--   BELUM                      = jalankan migrasi itu (dan yang sesudahnya) sesuai urutan
--   tidak terdeteksi otomatis  = migrasi yang hanya mengubah isi data/fungsi lama; periksa catatan Anda
-- Pemeriksaan memakai tanda khas (tabel/kolom/fungsi). Ini bantuan, bukan jaminan mutlak.
-- =====================================================================
select m.no, m.berkas,
       case when m.ada is null then 'tidak terdeteksi otomatis' when m.ada then 'ya' else 'BELUM' end as terpasang
from (values
  ('01', '01-skema.sql',                      to_regclass('public.warga') is not null and to_regclass('public.tagihan_ipl') is not null),
  ('02', '02-data-awal.sql',                  null::boolean),
  ('03', '03-pin-angka.sql',                  null::boolean),
  ('04', '04-import-warga.sql',               exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'warga' and column_name = 'wajib_ganti_pin')),
  ('05', '05-struktur-pengurus.sql',          to_regclass('public.gang') is not null),
  ('06', '06-nama-perumahan.sql',             null::boolean),
  ('07', '07-update-sensus-blok-ipl.sql',     exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'warga_kontak' and column_name = 'status_pernikahan')),
  ('08', '08-perbaikan-prioritas.sql',        to_regclass('public.audit_log') is not null),
  ('09', '09-fitur-bendahara.sql',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pengaturan' and column_name = 'tagihan_otomatis')),
  ('10', '10-polling-dan-rekap-alamat.sql',   to_regclass('public.polling') is not null),
  ('11', '11-nomor-jalan.sql',                exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gang' and column_name = 'nomor')),
  ('12', '12-status-hunian.sql',              exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'warga_kontak' and column_name = 'status_hunian')),
  ('13', '13-pin-awal-acak.sql',              to_regprocedure('public._pin_acak()') is not null),
  ('14', '14-batas-percobaan-login.sql',      to_regclass('public.percobaan_login') is not null),
  ('15', '15-import-hunian.sql',              coalesce((select pg_get_functiondef(p.oid) like '%v_hunian%' from pg_proc p where p.oid = to_regprocedure('public.import_warga(jsonb,text,text)')), false)),
  ('16', '16-status-tagihan-otomatis.sql',    to_regprocedure('public.status_tagihan_otomatis()') is not null),
  ('17', '17-batasi-bucket-publik.sql',      coalesce((select with_check like '%qris%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pw publik tulis'), false))
) as m(no, berkas, ada)
order by m.no;
