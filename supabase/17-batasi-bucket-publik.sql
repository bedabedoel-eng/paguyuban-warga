-- =====================================================================
-- 17-batasi-bucket-publik.sql
-- Memastikan bucket "publik" (yang dapat dibuka siapa pun yang tahu alamatnya) HANYA berisi foto lingkungan
-- dan gambar QRIS, bukan berkas pribadi (foto profil, bukti transfer, foto laporan, lampiran dokumen).
--
--  * Unggah/ubah ke bucket publik kini hanya boleh ke folder lingkungan/ dan qris/ (dan hanya admin).
--    Sebelumnya admin boleh menulis ke folder mana pun di bucket itu.
--  * Menegaskan kembali bahwa bucket "konten" dan "bukti" PRIVAT (berkas dibuka lewat tautan bertanda tangan).
--  * Penghapusan di bucket publik tetap boleh untuk admin agar berkas nyasar bisa dibersihkan.
--
-- Tidak menghapus atau memindahkan berkas yang sudah ada. Untuk memeriksa berkas lama yang terlanjur
-- berada di bucket publik di luar folder yang diizinkan, jalankan supabase/cek-bucket-publik.sql.
-- Aman dijalankan ulang. Prasyarat: 01-skema.sql.
-- =====================================================================
drop policy if exists "pw publik tulis" on storage.objects;
create policy "pw publik tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'publik' and public.is_admin() and (storage.foldername(name))[1] in ('lingkungan', 'qris'));

drop policy if exists "pw publik ubah" on storage.objects;
create policy "pw publik ubah" on storage.objects for update to authenticated
  using (bucket_id = 'publik' and public.is_admin())
  with check (bucket_id = 'publik' and public.is_admin() and (storage.foldername(name))[1] in ('lingkungan', 'qris'));

update storage.buckets set public = false where id in ('konten', 'bukti') and public is distinct from false;
