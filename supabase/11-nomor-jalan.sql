-- =====================================================================
-- 11 — Nomor pada jalan (cakupan sub-blok / nomor rumah)
-- Jalankan di Supabase > SQL Editor SETELAH 10-polling-dan-rekap-alamat.sql. Aman dijalankan ulang.
--
-- gang.nomor = sub-blok atau rentang nomor rumah yang dilalui jalan, dipisah koma. Contoh:
--   "3"        sub-blok 3 (rumah 3/1, 3/2, ...) ada di jalan ini
--   "1-20"     rumah nomor 1 sampai 20 ada di jalan ini
--   "3, 4"     sub-blok 3 dan 4
-- Dipakai untuk mengisi jalan otomatis saat import warga dan pendaftaran. Kosong = tidak dipakai.
-- =====================================================================
alter table public.gang add column if not exists nomor text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gang_nomor_check') then
    alter table public.gang add constraint gang_nomor_check check (char_length(nomor) <= 80);
  end if;
end $$;
