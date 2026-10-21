# Daftar migrasi database

Dua jalur, pilih salah satu:

| Keadaan | Yang dijalankan |
|---|---|
| **Proyek Supabase baru/kosong** | Hanya **`skema-lengkap.sql`** (sekali, di SQL Editor). Tidak perlu migrasi lain. |
| **Proyek yang sudah berjalan** | Migrasi bernomor yang **belum** dijalankan, **berurutan**, satu per satu. Jangan pakai `skema-lengkap.sql`. |

Untuk proyek yang sudah berjalan, jalankan dulu **`cek-migrasi.sql`** di SQL Editor: hasilnya menunjukkan migrasi mana yang sudah terpasang (`ya`) dan mana yang `BELUM`.
Semua migrasi aman dijalankan ulang dan tidak menghapus data. Migrasi lama tidak pernah diubah; perubahan baru selalu berupa nomor baru.

> Tiap kali ada migrasi baru, `skema-lengkap.sql` dibuat ulang dengan `bash supabase/buat-skema-lengkap.sh`
> dan diuji sama dengan migrasi berurutan oleh `supabase/tests/uji-skema-lengkap.sh`.

## Daftar centang (urutan wajib)

Centang `[x]` setelah dijalankan di proyek Anda.

- [ ] **01** `01-skema.sql` – tabel, fungsi, RLS, bucket penyimpanan. Jalankan sekali.
- [ ] **02** `02-data-awal.sql` – data awal contoh (profil paguyuban, blok, dll.). Sesuaikan isinya.
- [ ] **03** `03-pin-angka.sql` – aturan PIN angka 6 digit; fungsi `ubah_sandi`.
- [ ] **04** `04-import-warga.sql` – import warga massal dan kewajiban ganti PIN. *Jalankan sebelum men-deploy aplikasi yang membaca `wajib_ganti_pin`.*
- [ ] **05** `05-struktur-pengurus.sql` – jabatan pengurus (RBAC), jalan/gang, persetujuan kas, arsip, pengumuman per blok/jalan.
- [ ] **06** `06-nama-perumahan.sql` – nama dan alamat perumahan.
- [ ] **07** `07-update-sensus-blok-ipl.sql` – data sensus (pernikahan, anak), foto tautan, IPL per blok.
- [ ] **08** `08-perbaikan-prioritas.sql` – periode IPL, total transaksi, log audit kas.
- [ ] **09** `09-fitur-bendahara.sql` – laporan tunggakan, QRIS, tagihan IPL otomatis (jadwal pg_cron).
- [ ] **10** `10-polling-dan-rekap-alamat.sql` – polling warga, rekap blok/sub-blok/nomor.
- [ ] **11** `11-nomor-jalan.sql` – cakupan nomor pada jalan.
- [ ] **12** `12-status-hunian.sql` – rumah yang ditempati (milik sendiri/kontrak).
- [ ] **13** `13-pin-awal-acak.sql` – PIN awal **acak** per warga pada import/tambah warga (PIN hanya tampil sekali). *Jalankan sebelum men-deploy aplikasi baru.*
- [ ] **14** `14-batas-percobaan-login.sql` – penundaan bertahap setelah PIN salah berulang, peringatan ke pengurus, buka-kunci admin. Hook server opsional (lihat komentar di berkas).
- [ ] **15** `15-import-hunian.sql` – status hunian diisi langsung oleh `import_warga` (satu proses).
- [ ] **16** `16-status-tagihan-otomatis.sql` – penanda admin bila pg_cron tidak aktif sehingga tagihan otomatis tidak terbit.
- [ ] **17** `17-batasi-bucket-publik.sql` – bucket publik hanya menerima folder `lingkungan/` dan `qris/`; menegaskan bucket `konten` dan `bukti` privat. Setelahnya jalankan `cek-bucket-publik.sql`.

## Urutan yang perlu diperhatikan saat pembaruan aplikasi

Jalankan **SQL dulu, baru deploy aplikasi** (aplikasi baru memanggil fungsi yang dibuat migrasi). Aplikasi dirancang tetap berjalan bila 14, 16, atau 17 belum dijalankan (pembatasan/penanda tidak tampil), tetapi **13 dan 15 harus sudah dijalankan** sebelum deploy: tanpa 13 PIN awal acak tidak tersedia dan Import/Tambah warga tidak menampilkan daftar PIN.
