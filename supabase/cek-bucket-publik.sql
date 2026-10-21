-- =====================================================================
-- cek-bucket-publik.sql - Pemeriksaan (hanya membaca) agar tidak ada berkas pribadi di bucket "publik".
-- Jalankan di Supabase > SQL Editor. Hasil kosong pada bagian "BERKAS" berarti bersih.
--  * BUCKET: "publik" harus publik; "konten" dan "bukti" harus privat.
--  * BERKAS: berkas di bucket publik di luar folder lingkungan/ dan qris/. Bila itu berkas pribadi
--    (mis. foto profil dari versi lama), hapus lewat Storage > publik, lalu unggah ulang lewat aplikasi.
-- =====================================================================
select 'BUCKET' as jenis, b.id as nama,
       case when b.id = 'publik' and b.public then 'publik (sesuai rancangan: hanya foto lingkungan dan QRIS)'
            when b.id = 'publik' then 'PRIVAT - foto lingkungan dan QRIS tidak akan tampil untuk umum'
            when b.public then 'PUBLIK - HARUS PRIVAT, ubah di Storage > Buckets'
            else 'privat (benar)' end as keterangan
  from storage.buckets b where b.id in ('publik', 'konten', 'bukti')
union all
select 'BERKAS DI BUCKET PUBLIK', o.name,
       'di luar folder lingkungan/ dan qris/: periksa, hapus bila berkas pribadi'
  from storage.objects o
 where o.bucket_id = 'publik' and coalesce((storage.foldername(o.name))[1], '') not in ('lingkungan', 'qris')
order by 1, 2;
