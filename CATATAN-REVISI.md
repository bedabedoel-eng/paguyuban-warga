# Catatan Revisi — Paguyuban Warga Digital

Tanggal: 20 Oktober 2026. Cara pasang: timpa file di zip ke folder proyek (struktur folder sudah sama), jalankan SQL baru di Supabase, lalu `npm run build`.

## 1. Wajib dilakukan di database
| Berkas | Isi | Catatan |
|---|---|---|
| `supabase/12-status-hunian.sql` | Menambah kolom `status_hunian` (milik_sendiri / kontrak) di `warga_kontak` | Aman dijalankan ulang, tidak mengubah/menghapus data. Jalankan **sebelum** versi aplikasi baru dipakai. |

Tidak ada perubahan database lain. Hak hapus tetap mengikuti RLS yang sudah ada.

## 2. Fitur tabel data (cari, filter, sortir, tambah/ubah, hapus, halaman, ekspor)
Berlaku di semua menu yang disebut di bagian 3:
- Pencarian dengan jeda 300 ms; filter dengan tombol **Reset filter** dan keterangan "N sesuai filter dari M".
- Sortir dengan klik judul kolom (panah naik/turun).
- Tambah/ubah lewat form dengan validasi; hapus satu atau banyak dengan konfirmasi yang menyebut jumlah data.
- Halaman 10/25/50/100 per halaman; ekspor CSV (semua hasil filter, bukan hanya halaman aktif).
- Semua keadaan (kata cari, filter, urutan, halaman) tersimpan di URL, jadi tetap ada saat dimuat ulang dan bisa dibagikan.
- Nyaman di HP: tabel tampil sebagai kartu.
- Filter dan paging berjalan di browser (cukup sampai ±3.000 baris per daftar).

## 3. Menu yang disatukan
| Menu | Perubahan |
|---|---|
| Data rumah | Memakai komponen bersama + `config/rumah.js` (file halaman tinggal 15 baris). |
| Data anggota | Filter blok/jalan/status/pernikahan/rumah; aksi **Nonaktifkan/Aktifkan** (anggota diarsipkan, tidak dihapus); ekspor `data-anggota`; humas dibatasi ke jalannya; tautan lama `?gang=` dan `?blok=` tetap jalan. |
| Pengurus | Tetapkan, ubah, nonaktifkan/aktifkan, dan cabut jabatan lewat komponen bersama; form jabatan dan tabel hak akses tetap seperti semula. |
| Kelola IPL | Tab Periode dan Tunggakan memakai tabel bersama; tab dan periode tersimpan di URL (`?tab=`, `?periode=`); ekspor tagihan dan tunggakan. |
| Pengumuman | Cari, filter kategori, urutan, halaman (batas data 50 → 500). |
| Surat & notulen | Cari (judul, nomor, pihak), filter jenis (pengurus), urutan, halaman (batas 200 → 500). |
| Aspirasi masuk | Cari, filter status (bawaan "Perlu ditangani"; "Semua" = `?status=semua`), urutan, halaman. |
| Kegiatan | Daftar kegiatan dengan cari, urutan, halaman (batas 100 → 500); kalender dan tab tetap seperti semula. |

Sengaja **tidak** dipindahkan karena alurnya khusus: Direktori warga, Keuangan (Transaksi/Riwayat), Bukti transfer, Persetujuan kas, Verifikasi anggota, Polling, Blok & jalan, Kontak darurat.

## 4. Perubahan perilaku yang perlu diketahui
- Anggota **tidak lagi dihapus** dari tabel; dinonaktifkan (bisa diaktifkan kembali). Rumah, pengurus, dan data kecil dihapus permanen dengan konfirmasi.
- Hapus/ubah yang ditolak RLS (dulu "berhasil" padahal tidak berubah) kini menampilkan galat.
- Filter kategori/jenis/pencarian pada daftar kartu kini di browser; batas ambil data dinaikkan (lihat bagian 3).

## 5. Fitur baru
- **Rumah yang ditempati** (Milik sendiri / Kontrak) pada data warga: isian di form ubah anggota dan Ubah profil, kolom "Rumah" dan filter di tabel anggota, jumlah kontrak di ringkasan, kolom `status_hunian` di ekspor CSV. Import CSV belum memuat kolom ini.
- **Ajakan pasang aplikasi (PWA):** di HP yang belum memasang aplikasi, muncul kartu "Pasang aplikasi di HP Anda".
  - Android/Chrome: tombol "Pasang sekarang" membuka dialog pasang bawaan.
  - iPhone/iPad dan browser lain: petunjuk langkah singkat.
  - Tidak muncul bila sudah terpasang atau di laptop; bila ditutup, muncul lagi setelah 3 hari.
  - Hanya aktif di build produksi lewat HTTPS.

## 6. Struktur folder baru
```
src/components/data/   DataManager, DaftarKartu, BarAlat, Pager, FormModal, HalamanData
src/hooks/useDaftar.js          keadaan daftar di URL
src/lib/daftar.js               cari/filter/sortir/paging
src/services/_crud.js           pabrik layanan CRUD
src/features/admin/config/      rumah.js, warga.jsx
src/features/pengurus/config/   pengurus.jsx
src/components/layout/AjakPasang.jsx
supabase/12-status-hunian.sql
```
Kode tabel/filter/paging lama yang berulang di tiap menu sudah dihapus.

## 7. Menambah menu tabel baru
1. Buat `features/<area>/config/<menu>.js`: layanan (`buatLayanan({ tabel, urut, buang })`), `kolom`, `cari`, `filter`, `form.fields`, serta `hapus` / `aksiMassal` / `ekspor` bila perlu.
2. Halamannya satu baris: `<HalamanData konfig={konfig} />`, lalu daftarkan rute di `App.jsx`.
3. Untuk daftar kartu: `<DaftarKartu rows cari filters urutan renderItem />` (contoh: `Pengumuman.jsx`).

## 8. Pengujian
- `npm run build` berhasil; `npm test`: 26 lulus, 0 gagal.
- Diuji di browser dengan data contoh (`npm run dev:mock`): semua menu di atas, tampilan HP, dan ajakan pasang. Belum diuji dengan Supabase asli — cobalah hapus/nonaktifkan anggota dan hak akses tiap peran sebelum dipakai warga.
