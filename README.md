# Paguyuban Vila Gading Royal

Aplikasi paguyuban warga (satu lingkungan/RT) berbasis **React + Vite**, **Supabase** (Auth, PostgreSQL, Storage) dan di-hosting di **Cloudflare Pages**. Seluruhnya memakai paket gratis.

**Fitur:** login nomor HP + PIN 6 angka (opsional Google), pendaftaran dengan persetujuan pengurus, direktori & profil warga per blok dan gang/jalan, tagihan IPL, unggah bukti transfer, verifikasi bendahara, kas transparan dengan **persetujuan Ketua untuk pengeluaran besar**, pengumuman dan kegiatan (untuk semua warga, satu blok, atau satu gang/jalan), aspirasi & laporan, **arsip surat & notulen**, notifikasi realtime, struktur pengurus dengan **hak akses per jabatan**, dashboard sesuai peran untuk desktop dan HP.

Tampilan memakai **Plus Jakarta Sans** (judul) dan **Inter** (teks), ikon **Lucide**, dan dimuat dari paket npm (tanpa Google Fonts, sehingga CSP tetap ketat).

---

## Daftar isi
1. [Peran dan hak akses](#1-peran-dan-hak-akses)
2. [Struktur folder](#2-struktur-folder)
3. [Setup Supabase](#3-setup-supabase-15-menit)
4. [Menjalankan secara lokal](#4-menjalankan-secara-lokal)
5. [Membuat admin pertama](#5-membuat-admin-pertama)
6. [Login Google (opsional)](#6-login-google-opsional)
7. [GitHub](#7-github)
8. [Deploy ke Cloudflare Pages + domain sendiri](#8-deploy-ke-cloudflare-pages--domain-sendiri)
9. [Pengujian](#9-pengujian)
10. [Keamanan](#10-keamanan)
11. [Batasan paket gratis](#11-batasan-paket-gratis)
12. [Pemeliharaan & pemecahan masalah](#12-pemeliharaan--pemecahan-masalah)

---

## 1. Peran dan hak akses

**Wilayah:** perumahan dibagi menjadi **blok** (mis. Blok C), dan setiap blok dapat berisi beberapa **gang / jalan** (mis. Jl. Zamrud, Jl. Safir). Alamat warga ditulis lengkap, misalnya **Blok C 3/5 · Jl. Zamrud**. Nomor rumah boleh memakai garis miring, titik, atau huruf (3/5, 12A, C.3). Daftar gang diatur Ketua, Wakil, Sekretaris, atau Admin di menu **Blok & gang**. Jalan yang melintasi beberapa blok dapat dibuat sebagai gang "lintas blok".

Setiap pengurus punya **jabatan** (teks bebas, mis. "Humas Jl. Zamrud") dan **peran** yang menentukan hak aksesnya. Peran diatur Ketua/Admin di **Pengurus > Atur pengurus**.

| Peran | Fokus | Bisa |
|---|---|---|
| **Warga** | Anggota aktif | Lihat direktori, tagihan rumahnya sendiri, kas (ringkasan & transaksi yang sudah disetujui), pengumuman & kegiatan untuk semua warga dan gangnya; kirim bukti bayar & aspirasi; baca notulen yang dibagikan |
| **Ketua** | Pengawasan & keputusan penting | Semua fitur pengurus, **menyetujui/menolak pengeluaran** di atas batas, mengatur susunan pengurus dan perannya |
| **Wakil Ketua** | Membantu Ketua | Memantau semua modul (termasuk pengeluaran yang menunggu), verifikasi anggota, pengumuman, kegiatan, aspirasi, arsip. **Tidak** mencatat kas atau menyetujui pengeluaran |
| **Sekretaris** | Administrasi | Verifikasi & ubah data anggota, pengumuman, agenda kegiatan, **surat masuk/keluar dan notulen** |
| **Bendahara** | Keuangan | Tagihan IPL, verifikasi bukti transfer, data rumah, catat pemasukan/pengeluaran, laporan kas. Pengeluaran ≥ batas persetujuan (default Rp 1.000.000) menunggu keputusan Ketua dan belum mengurangi saldo |
| **Humas Gang** | Satu gang / jalan | Verifikasi pendaftar, ubah data warga, tanggapi aspirasi, dan buat pengumuman/kegiatan **khusus gang/jalan yang dipegang**. Warga gang lain di blok yang sama tidak termasuk |
| **Seksi / anggota** | Tampil di struktur | Seperti warga, ditambah ringkasan pengurus |
| **Admin** | Teknis | Semua hak + pengaturan paguyuban, import warga, ubah peran/nomor HP, atur ulang PIN |

Ringkasan matriks (✓ = penuh, ◐ = terbatas):

| Modul | Ketua | Wakil | Sekretaris | Bendahara | Humas Gang |
|---|---|---|---|---|---|
| Verifikasi & data anggota | ✓ | ✓ | ✓ | – | ◐ gangnya |
| Daftar blok & gang | ✓ | ✓ | ✓ | – | – |
| Pengumuman & kegiatan | ✓ | ✓ | ✓ | – | ◐ gangnya |
| Aspirasi warga | ✓ | ✓ | lihat | – | ◐ gangnya |
| IPL & kas | lihat + setujui | lihat | – | ✓ | – |
| Surat & notulen | ✓ | ✓ | ✓ | lihat | lihat |
| Atur pengurus | ✓ | – | – | – | – |

Matriks yang sama tampil di **Ringkasan pengurus** sebagai rujukan. Catatan perubahan: sebelumnya jabatan berisi kata "Ketua" (termasuk Wakil Ketua) otomatis mendapat hak bendahara; kini hak keuangan hanya untuk Ketua, Bendahara, dan Admin.

Semua aturan ini ditegakkan **di database (RLS)**, bukan hanya di tampilan. Kunci yang ada di frontend hanyalah kunci publik (anon/publishable).

### Menu cepat, direktori foto, ekspor & impor

- **Menu cepat 8 kotak** di Beranda (warga) dan Ringkasan pengurus. Kotak ke-8 selalu **Semua menu** (`/menu`), halaman berisi seluruh fitur sesuai jabatan dan bisa dicari. Menu cepat pengurus mengikuti kewenangan dan menampilkan lencana jumlah tugas.
- **Direktori warga** tampil sebagai kartu foto rasio **3:4** (ada pilihan tampilan Daftar), dengan filter blok/gang/pekerjaan, pencarian, dan urutan (per blok & gang, nama, nomor rumah, tanggal bergabung). Foto profil yang diunggah otomatis dipotong 3:4. Tombol **Direktori** ada di navigasi bawah HP.
- **Sortir tabel**: klik judul kolom pada tabel (di HP lewat pilihan *Urutkan*). Daftar pengumuman, kegiatan, arsip, kas, dan aspirasi punya pilihan urutan.
- **Halaman Warga satu pintu** (pengurus pengelola warga): satu halaman tanpa tab berisi tabel semua warga (tampilan **Tabel** atau **Foto**), cari dan filter (termasuk *kelengkapan data*), ubah per orang, **Ubah massal** untuk baris terpilih, **Ekspor CSV**, dan **Import & perbaiki CSV**. Humas melihat semua warga, dengan filter bawaan *Wilayah saya*. Warga biasa tetap melihat Direktori.
- **Ekspor CSV** (pengurus): data warga (sesuai filter yang aktif) dan Blok & gang. Berkas memakai pemisah titik koma dan terbuka langsung di Excel/Google Sheets; kolom awalnya sama dengan berkas impor, ditambah kolom `keanggotaan` dan `id`.
- **Import & perbaiki CSV**: berkas hasil Ekspor yang diperbaiki di Excel bisa diimpor ulang. Baris dicocokkan lewat `id` (atau nomor HP): warga lama diperbarui, nomor HP baru menjadi akun baru (admin). Pratinjau menampilkan perubahan per kolom sebelum disimpan. Kolom yang dihapus dari berkas tidak diubah.
- **Impor CSV**: warga lewat *Import warga* (admin), blok & gang lewat tombol **Impor CSV** di menu Blok & gang (kolom `blok`, `nama_blok`, `gang`). Gang yang sudah ada dilewati; blok baru hanya dapat dibuat admin.

## 2. Struktur folder

```
paguyuban-warga/
├─ supabase/
│  ├─ 01-skema.sql        # tabel, fungsi, trigger, RLS, storage (jalankan sekali)
│  ├─ 02-data-awal.sql    # profil paguyuban, blok, kontak darurat (sesuaikan)
│  ├─ 03-pin-angka.sql    # aturan PIN 6 angka (jalankan setelah 01)
│  ├─ 04-import-warga.sql # import warga massal + wajib ganti PIN (setelah 03)
│  ├─ 05-struktur-pengurus.sql # peran pengurus, hak per jabatan, persetujuan kas, arsip surat (setelah 04)
│  ├─ 06-nama-perumahan.sql    # nama & alamat perumahan (database yang sudah berjalan)
│  ├─ 07-update-sensus-blok-ipl.sql # sensus (status nikah, anak), foto dari tautan, pengurus & IPL per blok (setelah 06)
│  ├─ 08-perbaikan-prioritas.sql # log audit kas + pulihkan transaksi, daftar periode & total transaksi di database (setelah 07)
│  ├─ 09-fitur-bendahara.sql   # laporan tunggakan, QRIS, tagihan IPL otomatis tiap bulan (setelah 08)
│  ├─ 10-polling-dan-rekap-alamat.sql # polling warga + tampilan rekap blok/sub-blok/nomor (setelah 09)
│  ├─ 11-nomor-jalan.sql              # kolom gang.nomor: cakupan nomor/sub-blok tiap jalan (setelah 10)
│  ├─ 12-status-hunian.sql           # rumah yang ditempati: milik sendiri / kontrak (setelah 11)
│  ├─ 13-pin-awal-acak.sql           # PIN awal ACAK per warga pada import/tambah warga (setelah 12)
│  ├─ 14-batas-percobaan-login.sql   # penundaan login bertahap + peringatan pengurus; hook server opsional (setelah 13)
│  ├─ 15-import-hunian.sql           # status hunian diisi langsung oleh import_warga, satu proses (setelah 14)
│  ├─ 16-status-tagihan-otomatis.sql # penanda admin bila pg_cron tidak aktif (setelah 15)
│  ├─ 17-batasi-bucket-publik.sql    # bucket publik hanya untuk foto lingkungan dan QRIS (setelah 16)
│  ├─ 18-nama-paguyuban-vgr.sql      # nama paguyuban menjadi "Paguyuban Vila Gading Royal" (opsional)
│  ├─ skema-lengkap.sql              # gabungan 01..terakhir untuk INSTALASI BARU (dihasilkan: bash supabase/buat-skema-lengkap.sh)
│  ├─ DAFTAR-MIGRASI.md              # daftar centang urutan migrasi
│  ├─ cek-migrasi.sql                # melihat migrasi mana yang sudah terpasang (hanya membaca)
│  ├─ cek-bucket-publik.sql          # memeriksa berkas pribadi di bucket publik (hanya membaca)
│  └─ tests/               # Postgres LOKAL, bukan proyek Supabase: jalankan.sh (uji-rls.sql + uji-fitur.sql), uji-skema-lengkap.sh
├─ public/                # favicon, manifest PWA, _headers (header keamanan & cache; tanpa _redirects, lihat bagian 8)
├─ wrangler.jsonc         # Cloudflare Workers Assets: aset dist/ + fallback SPA
├─ .github/workflows/     # CI: npm test, build, dan uji RLS di Postgres
├─ src/
│  ├─ main.jsx, App.jsx   # entry + seluruh rute
│  ├─ routes/guards.jsx   # penjaga rute (login, aktif, hak per peran)
│  ├─ context/            # Auth (hak akses), Pengaturan, Toast, Notifikasi, Tugas (antrean pengurus)
│  ├─ lib/                # supabase client, akses (peran & matriks), format, nomor HP, upload foto, galat
│  ├─ services/           # semua akses data Supabase, satu file per domain
│  ├─ hooks/              # useAsync, useDebounce, useMediaQuery
│  ├─ components/
│  │  ├─ ui/              # Button, Field, Card, Modal, Tabs, ImagePicker, dst. (reusable)
│  │  ├─ layout/          # Sidebar, Topbar, BottomNav, PageHeader, AppShell
│  │  └─ illustrations/   # Logo dan motif atap (SVG)
│  ├─ features/           # satu folder per modul layar
│  │  ├─ auth/ beranda/ warga/ ipl/ keuangan/ pengumuman/ kegiatan/
│  │  └─ laporan/ pengurus/ administrasi/ profil/ pengaturan/ menu/ notifikasi/ admin/
│  └─ styles/             # tokens (warna, huruf, jarak), base, components, layout, pages
├─ tests/                 # unit/ (npm test) + mock/ & konfigurasi Vite untuk uji tampilan tanpa Supabase (npm run dev:mock)
├─ .env.example
└─ vite.config.js
```

Menambah modul baru: buat tabel + kebijakan RLS di SQL, tambahkan `src/services/<modul>.js`, buat layar di `src/features/<modul>/`, daftarkan rute di `App.jsx`.

### Format alamat: blok, sub-blok, nomor

Alamat dipecah menjadi tiga kolom agar mudah direkap: **blok** (A), **sub-blok** (3), dan **no. rumah** (5), ditampilkan sebagai *Blok A 3 No.5*. Di database ketiganya tetap tersimpan sebagai `blok` + `no_rumah` (`3/5`), sehingga data lama tidak berubah; tampilan `rekap_warga` / `rekap_rumah` memisahnya menjadi kolom `blok`, `sub_blok`, `nomor`. Formulir pendaftaran dan ubah anggota punya isian *Sub-blok* dan *No. rumah* terpisah, tabel Data anggota dan hasil ekspor memakai kolom `blok`, `sub_blok`, `no_rumah`.

**Import CSV** memahami berbagai penulisan dan memisahkannya otomatis menjadi blok A, sub-blok 3, nomor 5: kolom `blok`=`A`, `sub_blok`=`3`, `no_rumah`=`5`; atau `blok`=`A3` dan `no_rumah`=`5`; atau `no_rumah`=`3/5`; atau satu kolom `alamat` berisi *Blok A3 No.5*, *A3-5*, *A 3 5*. Blok yang tidak dikenal tetap ditolak di pratinjau.

## 3. Setup Supabase (±15 menit)

1. Daftar di <https://supabase.com> dan klik **New project** (pilih region terdekat, mis. *Southeast Asia (Singapore)*). Simpan *database password*.
2. **Atur autentikasi** (penting):
   - **Authentication > Sign In / Providers > Email**: biarkan *Enable Email provider* aktif, **matikan "Confirm email"**. Aplikasi memakai email internal `628xxx@domain-anda` hanya sebagai penampung nomor HP, tidak ada email yang dikirim.
   - Di bagian yang sama atur **Minimum password length = 6** (PIN warga terdiri dari 6 angka; nilai 8 akan membuat pendaftaran gagal).
   - **Authentication > URL Configuration**: *Site URL* = `https://domain-anda.id` (isi setelah domain siap; sementara boleh `http://localhost:5173`). Tambahkan di *Redirect URLs*: `http://localhost:5173/**` dan `https://domain-anda.id/**`.
3. **Jalankan SQL**: buka **SQL Editor > New query**.
   - **Proyek Supabase baru/kosong:** cukup tempel isi **`supabase/skema-lengkap.sql`** lalu **Run** (satu berkas, memuat 01 sampai terakhir beserta data awal contoh), kemudian lanjut ke langkah 4. Jangan menjalankan berkas 01-18 satu per satu sesudahnya. Sesuaikan nama paguyuban, RT/RW, tarif, rekening, dan blok lewat menu Admin.
   - **Proyek yang sudah berjalan:** jalankan `supabase/cek-migrasi.sql` untuk melihat migrasi mana yang BELUM terpasang, lalu jalankan hanya migrasi itu, berurutan (daftar centang: `supabase/DAFTAR-MIGRASI.md`). Rincian per berkas di bawah.
   - Tempel isi `supabase/01-skema.sql` lalu **Run**. Aman dijalankan ulang.
   - Tempel isi `supabase/03-pin-angka.sql` lalu **Run** (mengubah aturan sandi menjadi PIN 6 angka; **wajib** dijalankan setelah `01`).
   - Tempel isi `supabase/04-import-warga.sql` lalu **Run** (import warga massal dan kewajiban ganti PIN). **Jalankan sebelum men-deploy versi aplikasi yang memakainya.**
   - Tempel isi `supabase/05-struktur-pengurus.sql` lalu **Run** (peran pengurus, hak akses per jabatan, persetujuan pengeluaran, arsip surat & notulen, gang/jalan di dalam blok, pengumuman per blok/gang, nomor rumah format 3/5). Aman dijalankan ulang dan **tidak menghapus data**; jabatan lama dipetakan otomatis ke peran (mis. "Bendahara" → peran Bendahara). Setelah itu buka menu **Blok & gang**, isi daftar gang/jalan tiap blok, lalu lengkapi jalan warga lama di menu **Warga** (filter jalan *Belum ada jalan*, pilih semua, lalu **Ubah massal**). **Wajib** sebelum men-deploy versi ini. Bila suatu saat Anda menjalankan ulang `01`, jalankan ulang `05` sesudahnya.
   - Tempel isi `supabase/06-nama-perumahan.sql` lalu **Run** (hanya untuk database yang sudah berjalan: mengganti nama lingkungan menjadi *Perumahan Vila Gading Royal* dan alamat *Desa Pamegarsari, Kec. Parung, Kab. Bogor*; RT/RW dan pengaturan lain tidak disentuh). Instalasi baru tidak perlu karena `01`/`02` sudah memakainya.
   - Tempel isi `supabase/07-update-sensus-blok-ipl.sql` lalu **Run** (jalankan **setelah 06**, sebelum men-deploy versi aplikasi ini). Menambah status pernikahan & jumlah anak, foto profil dari tautan https, serta **pengurus per blok**: pada *Pengurus > Atur pengurus* Ketua/Wakil/Sekretaris/Bendahara dapat diberi *Wilayah blok*. Data IPL (tagihan, bukti transfer, rincian di kas, statistik) hanya terlihat oleh pemilik rumah dan pengurus blok itu; pengumuman & kegiatan pengurus blok dibatasi ke bloknya. Pengurus tanpa wilayah blok tetap berlaku untuk semua blok. Aman dijalankan ulang; jalankan lagi bila `05` pernah diulang.
   - Tempel isi `supabase/08-perbaikan-prioritas.sql` lalu **Run** (jalankan **setelah 07**; aman diulang). Menambah **log audit kas** (setiap tambah/ubah/hapus transaksi kas dan hapus tagihan IPL tercatat: siapa, kapan, isi sebelum/sesudah; tidak bisa diubah atau dihapus lewat aplikasi), fitur **Pulihkan transaksi** (tab *Riwayat perubahan* di Kas paguyuban, untuk bendahara; pengeluaran besar yang dipulihkan kembali menunggu persetujuan Ketua), serta fungsi `periode_ipl_tersedia` dan `ringkasan_transaksi` agar daftar periode dan total kas tetap benar walau data banyak. Juga membuat tanggal bawaan kas & dokumen memakai zona Asia/Jakarta (bukan UTC). Aplikasi tetap berjalan bila `08` belum dijalankan, hanya tanpa riwayat perubahan.
   - Tempel isi `supabase/09-fitur-bendahara.sql` lalu **Run** (jalankan **setelah 08**; aman diulang). Mengaktifkan: **Kelola IPL > Tunggakan** (daftar rumah yang lewat jatuh tempo, filter blok, ekspor CSV, tombol **Ingatkan** yang membuka WhatsApp dengan pesan terisi), **gambar QRIS** di halaman Bayar IPL (unggah di *Pengaturan > Iuran & keuangan*), dan **tagihan IPL otomatis**: nyalakan saklarnya di Pengaturan, lalu pastikan ekstensi **pg_cron** aktif (Supabase > Database > Extensions) dan jalankan ulang berkas 09 sekali supaya jadwal (tanggal 1, 07.05 WIB) terpasang. Tanpa pg_cron, tagihan tetap bisa diterbitkan manual seperti biasa.
   - Tempel isi `supabase/10-polling-dan-rekap-alamat.sql` lalu **Run** (jalankan **setelah 09**; aman diulang). Menambah **Polling warga** (menu *Polling*: pengurus berwenang membuat pertanyaan dengan 2–10 pilihan, batas waktu, sasaran semua/blok/jalan, opsi *satu rumah satu suara* dan *boleh pilih lebih dari satu*; suara rahasia, tidak bisa diubah, hasil tampil setelah memilih atau setelah ditutup) serta dua tampilan SQL **`rekap_warga`** dan **`rekap_rumah`** dengan kolom `blok`, `sub_blok`, `nomor` terpisah untuk rekap (mis. `select blok, sub_blok, count(*) from rekap_warga where status = 'aktif' group by 1, 2 order by 1, 2;`).
   - Tempel isi `supabase/11-nomor-jalan.sql` lalu **Run** (setelah 10; aman diulang). Menambah kolom **Nomor** pada jalan. Impor/ekspor *Blok & jalan* kini berformat **Blok | Nomor | Jalan** (nomor = sub-blok atau rentang rumah, mis. `3` atau `1-20`; beberapa baris untuk jalan yang sama digabung). Bila kolom jalan pada impor warga/pendaftaran kosong, jalan diisi otomatis dari nomor rumah jika hanya satu jalan yang cocok.
   - Tempel isi `supabase/12-status-hunian.sql` lalu **Run** (setelah 11; aman diulang). Menambah isian **Rumah yang ditempati** (milik sendiri / kontrak).
   - Tempel isi `supabase/13-pin-awal-acak.sql` lalu **Run** (setelah 12; aman diulang). **Jalankan sebelum men-deploy aplikasi baru.** Import CSV dan Tambah warga memberi tiap akun **PIN awal acak** (bukan PIN seragam); PIN hanya ditampilkan sekali dan bisa diunduh sebagai CSV.
   - Tempel isi `supabase/14-batas-percobaan-login.sql` lalu **Run** (setelah 13; aman diulang). PIN salah berulang menunda login bertahap (5x: 30 dtk, 6x: 1 mnt, 7x: 5 mnt, 8x: 15 mnt, 9x dst.: 1 jam) dan pengurus mendapat peringatan; admin bisa **Buka kunci login** di Ubah anggota. **Catatan keamanan:** tanpa langkah opsional di bawah, batas ini berlaku lewat halaman masuk aplikasi saja dan bisa dilewati bila penyerang memanggil API Supabase Auth langsung. Untuk penegakan penuh di server aktifkan hook **Password verification** (Authentication > Hooks) ke fungsi `public.hook_verifikasi_pin` bila paket Supabase Anda menyediakannya (ketersediaan menurut paket belum kami pastikan).
   - Tempel isi `supabase/15-import-hunian.sql` lalu **Run** (setelah 14; aman diulang). Kolom `status_hunian` pada CSV kini diisi langsung oleh fungsi import (satu proses, tanpa pembaruan susulan).
   - Tempel isi `supabase/16-status-tagihan-otomatis.sql` lalu **Run** (setelah 15; aman diulang). Admin melihat peringatan di Ringkasan pengurus dan Pengaturan bila saklar tagihan otomatis menyala tetapi pg_cron tidak aktif.
   - Tempel isi `supabase/20-perbaikan-warga-massal.sql` lalu **Run** (setelah 19; aman diulang). **Jalankan sebelum men-deploy aplikasi baru.** Menyediakan perbaikan data massal (Import & perbaiki CSV, Ubah massal) dan penggantian nomor HP yang ikut memindahkan akun login.
   - Tempel isi `supabase/17-batasi-bucket-publik.sql` lalu **Run** (setelah 16; aman diulang). Bucket `publik` hanya menerima folder `lingkungan/` dan `qris/`. Jalankan juga `supabase/cek-bucket-publik.sql` untuk memastikan tidak ada berkas pribadi yang tertinggal di sana.
   - Buka `supabase/02-data-awal.sql`, **sesuaikan** (nama paguyuban, RT/RW, alamat, tarif IPL, rekening, daftar blok, kontak darurat), tempel, lalu **Run**. Semua ini juga bisa diubah nanti dari menu Admin.
4. **Ambil kunci**: **Project Settings > API Keys** (atau *Data API*). Salin:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key (atau *Publishable key*)
   
   ⚠️ **Jangan** memakai atau menyalin `service_role` / *secret* key ke aplikasi ini. Aplikasi tidak membutuhkannya.
5. Bucket penyimpanan (`publik`, `konten`, `bukti`) beserta kebijakannya sudah dibuat oleh SQL. Cek di **Storage**.

## 4. Menjalankan secara lokal

Prasyarat: **Node.js 20+** dan npm.

```bash
cd paguyuban-warga
npm install
cp .env.example .env.local     # lalu isi nilainya
npm run dev                    # http://localhost:5173
```

Isi `.env.local`:

| Variabel | Isi |
|---|---|
| `VITE_SUPABASE_URL` | Project URL dari langkah 3.4 |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key |
| `VITE_AUTH_EMAIL_DOMAIN` | domain email internal, mis. `akun.paguyubananda.id`. Pakai subdomain dari domain Anda sendiri. **Jangan diubah setelah ada warga mendaftar.** Bila terlanjur diganti, jalankan `supabase/alat-ganti-domain-akun.sql`. Domain ini hanya label internal, tidak harus sama dengan alamat aplikasi. |
| `VITE_GOOGLE_LOGIN` | `true` bila login Google sudah diaktifkan (bagian 6), selain itu `false` |

Perintah lain: `npm run build` (hasil di `dist/`), `npm run preview` (uji hasil build), `npm run dev:mock` (menjalankan tampilan dengan data contoh tanpa Supabase; buka `http://127.0.0.1:5174/?as=ketua`, ganti `ketua` dengan `warga`, `wakil`, `sekretaris`, `bendahara`, `humas`, atau `admin`).

## 5. Membuat admin pertama

1. Buka aplikasi, klik **Daftar**, isi data Anda sendiri. Anda akan melihat layar "Menunggu Persetujuan".
2. Di Supabase **SQL Editor**, jalankan (ganti dengan nomor HP Anda):
   ```sql
   select public.jadikan_admin('081234567890');
   ```
   Hasilnya `Berhasil: akun sekarang Admin aktif.`
3. Di aplikasi tekan **Periksa status** atau muat ulang. Anda masuk sebagai admin dan melihat menu **Panel Admin**.
4. Mulai sekarang pendaftar baru muncul di **Admin > Verifikasi Anggota**. Susun pengurus lewat **Pengurus > Atur pengurus**: pilih warga, tulis jabatan, pilih peran, dan untuk Humas pilih gang/jalan yang dipegang. Buat dulu daftar gang di menu **Blok & gang**.

Fungsi `jadikan_admin` tidak dapat dipanggil dari aplikasi, hanya dari SQL Editor.

**Import warga massal:** masuk sebagai admin > **Warga > Import Warga**. Unduh contoh CSV, isi kolom `nama, hp, blok, no_rumah` (nomor boleh 3/5; opsional `gang` berisi nama gang/jalan persis seperti di menu Blok & gang, `pekerjaan`, `kepala_keluarga` ya/tidak), unggah, periksa pratinjau, lalu **Buat Akun**. Semua akun langsung aktif dengan **PIN awal acak yang berbeda untuk tiap warga**. Daftar PIN (nama, HP, PIN awal) ditampilkan **sekali** setelah proses dan bisa diunduh sebagai CSV; PIN tidak tersimpan di sistem (hanya hash-nya), jadi unduh sebelum menutup halaman dan sampaikan ke warga lewat pesan pribadi. Warga otomatis diminta membuat PIN baru saat pertama masuk (layar *Buat PIN Baru*). Kolom `status_hunian` (milik sendiri / kontrak) ikut diisi dalam proses yang sama. Menambah satu warga lewat **Tambah warga** bekerja sama (PIN acak ditampilkan sekali). Warga yang belum mengganti PIN ditandai di **Data Warga** (filter *Belum ganti PIN*). Satu nomor HP hanya untuk satu akun; baris dengan nomor ganda atau blok tak dikenal dilewati dan dilaporkan. Uji dulu dengan 2-3 baris.

**Lupa PIN:** karena tidak memakai SMS/email, warga menghubungi admin. Admin membuka **Data Warga > Ubah > Atur Ulang PIN**, mengisi PIN sementara (6 angka). Warga otomatis diminta membuat PIN baru saat masuk. Mengatur ulang PIN juga mengakhiri penundaan login akun itu.

## 6. Login Google (opsional)

1. <https://console.cloud.google.com> > buat project > **APIs & Services > OAuth consent screen** (External, isi nama aplikasi & email) > **Credentials > Create credentials > OAuth client ID** > *Web application*.
2. **Authorized redirect URI**: salin dari Supabase **Authentication > Providers > Google** (bentuknya `https://xxxx.supabase.co/auth/v1/callback`).
3. Salin *Client ID* dan *Client Secret* ke form Google di Supabase, aktifkan, simpan. (Secret hanya diisi di dashboard Supabase, bukan di aplikasi.)
4. Set `VITE_GOOGLE_LOGIN=true` (lokal dan di Cloudflare), lalu build ulang.

Pendaftar Google diminta melengkapi **nomor HP, blok, gang/jalan, dan nomor rumah**, lalu tetap menunggu persetujuan pengurus.

## 7. GitHub

```bash
cd paguyuban-warga
git init
git add .
git commit -m "Paguyuban Vila Gading Royal"
git branch -M main
git remote add origin https://github.com/<akun-anda>/paguyuban-warga.git
git push -u origin main
```

Buat repository kosong terlebih dahulu di GitHub (disarankan **Private**). `.gitignore` sudah mengecualikan `.env.local` dan `node_modules`. Jangan pernah meng-commit file `.env*` berisi kunci.

## 8. Deploy ke Cloudflare Pages + domain sendiri

1. <https://dash.cloudflare.com> > **Workers & Pages > Create > Import a repository (Git)** > pilih repository. Repository ini memakai **Workers dengan aset statis** (`wrangler.jsonc`), bukan Pages klasik; bila dashboard Anda masih menawarkan Pages, langkah build di bawah sama. Nama proyek harus sama dengan `name` di `wrangler.jsonc`.
2. Pengaturan build:
   - **Framework preset**: Vite (atau None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables** (Production & Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_EMAIL_DOMAIN`, `VITE_GOOGLE_LOGIN`, dan `NODE_VERSION` = `20`
3. **Save and Deploy**. Setiap `git push` ke `main` otomatis membangun ulang.
4. **Domain sendiri**: project Pages > **Custom domains > Set up a custom domain** > masukkan mis. `warga.domainanda.id`. 
   - Bila domain dikelola di Cloudflare DNS, rekam CNAME dibuat otomatis.
   - Bila DNS di tempat lain, tambahkan `CNAME warga → <project>.pages.dev` di penyedia DNS Anda.
   - SSL/HTTPS aktif otomatis.
5. Kembali ke Supabase > **Authentication > URL Configuration**: ubah *Site URL* ke `https://warga.domainanda.id` dan tambahkan `https://warga.domainanda.id/**` ke *Redirect URLs* (juga `https://<project>.pages.dev/**` bila dipakai).
6. Berkas `wrangler.jsonc` (opsi `not_found_handling: single-page-application`) membuat semua rute (mis. `/ipl`) tetap terbuka saat halaman di-refresh; `name` di dalamnya harus sama dengan nama proyek di Cloudflare. Jangan membuat `public/_redirects` berisi `/* /index.html 200` karena ditolak Workers (deteksi perulangan). Berkas `public/_headers` memasang header keamanan dan *Content-Security-Policy*. Bila Anda memakai domain Supabase kustom atau layanan luar lain, tambahkan ke `connect-src`/`img-src` di berkas itu.

## 9. Pengujian

Yang sudah diuji pada pengembangan (stack Postgres + GoTrue + PostgREST asli, dengan penegakan RLS):

- **67 pemeriksaan database**: warga menunggu tidak melihat data, tidak bisa menaikkan peran sendiri, privasi nomor HP, isolasi tagihan antar rumah, bukti transfer hanya terbaca pemilik/bendahara, unggah ke folder orang lain ditolak, verifikasi → lunas → kas otomatis, kuota kegiatan, laporan hanya terlihat pelapor/pengurus, admin terakhir tidak bisa diturunkan, anon tidak bisa membaca data pribadi.
- **60 pemeriksaan halaman** (30 rute × desktop & HP): tanpa galat dan tanpa scroll horizontal.
- **Pembaruan tampilan & hak akses (migrasi 05):** 90 pemeriksaan database pada PGlite (Postgres) dengan RLS: peningkatan dari data jabatan lama dan dari versi awal migrasi 05, migrasi dijalankan dua kali, hak tiap peran, daftar gang (siapa boleh mengubah, nama ganda ditolak, terbaca formulir pendaftaran), pendaftar/data/aspirasi dibatasi per gang untuk Humas (gang lain di blok yang sama tidak terlihat), pengumuman untuk semua/satu blok/satu gang beserta notifikasinya, nomor rumah 3/5, pendaftaran & lengkapi data & import dengan gang, alur persetujuan pengeluaran dan saldo, dokumen publik/internal, pengelolaan pengurus oleh Ketua. Ditambah tangkapan layar seluruh rute untuk 7 peran (desktop & HP) tanpa galat konsol dan tanpa scroll horizontal, serta uji alur: login, tolak pengeluaran, pencarian, form kas di HP, keluar.
- **21 pemeriksaan alur browser**: daftar → menunggu → disetujui → tagihan terbit → bayar + unggah bukti → verifikasi → kas bertambah → pembatasan rute per peran → laporan dengan foto.

- **Uji RLS per peran (`supabase/tests/uji-rls.sql`)**: 93 pemeriksaan otomatis pada Postgres lokal (kini dijalankan pada migrasi 01–17 dari database kosong): warga hanya melihat tagihan rumahnya, tidak bisa menaikkan peran/status, mencatat kas, melunasi tagihan, atau menulis log audit; Wakil Ketua tidak bisa mencatat/memulihkan; pengeluaran ≥ batas oleh bendahara menunggu Ketua dan tidak bisa disetujui sendiri; log audit mencatat pelaku, nilai sebelum/sesudah, dan tidak bisa diubah/dihapus (bahkan oleh superuser); pulihkan transaksi mengembalikan baris yang sama dan tidak melewati persetujuan Ketua; laporan tunggakan hanya untuk bendahara dan hanya menghitung tagihan belum bayar yang lewat jatuh tempo; tagihan otomatis mati bawaan, tidak ganda, dan tidak bisa dipanggil pengguna aplikasi; polling: hanya pengelola yang bisa membuat, peserta dibatasi sasaran, suara tidak bisa dibaca/ditulis langsung, satu rumah satu suara (termasuk dua anggota rumah yang sama), hasil tersembunyi sebelum memilih, polling tertutup menolak suara. Jalankan: `PGURL="postgresql://postgres@localhost:5432/uji" ./supabase/tests/jalankan.sh` pada database **kosong** (berkas `00-stub-supabase.sql` meniru skema Supabase dan jangan dijalankan di Supabase sungguhan).
- **Ketahanan aplikasi**: *error boundary* (galat pada satu halaman tidak mematikan seluruh aplikasi; galat muat berkas setelah deploy baru memuat ulang sekali otomatis), **PWA** (service worker menyimpan cangkang aplikasi saja, data Supabase tidak pernah disimpan; banner "Versi baru tersedia → Perbarui" dan penanda offline), serta paginasi/“Muat lagi” pada daftar panjang (bukti menunggu, transaksi, riwayat) dan pembacaan per halaman agar tidak terpotong batas 1000 baris Supabase.

- **Uji fitur & RLS per peran (`supabase/tests/uji-fitur.sql`, 156 pemeriksaan, Postgres lokal, migrasi 01-17 dari database kosong)**: peran admin, bendahara blok A, bendahara blok B, humas, dan warga biasa. Mencakup IPL per blok (siapa melihat/menerbitkan/melunasi/memverifikasi tagihan, notifikasi bukti hanya ke bendahara blok terkait, kas bersumber IPL per blok), import warga (hanya admin; PIN acak 6 angka berbeda per akun, hash cocok, PIN tidak masuk log/notifikasi; baris tidak valid dilewati utuh; hunian, pernikahan, jalan, foto), tambah warga manual, status hunian (constraint dan siapa boleh mengubah), batas percobaan login dan hook server, penanda pg_cron (dengan tiruan skema `cron`), serta kebijakan penyimpanan (bucket publik hanya `lingkungan/` dan `qris/`; berkas pribadi per peran). Uji ini sudah dicoba dengan **mutasi** (kebijakan sengaja dirusak) dan terbukti gagal bila aturan dilanggar.
- **Skema lengkap**: `supabase/tests/uji-skema-lengkap.sh` menjalankan `skema-lengkap.sql` di database kosong dan membandingkan hasil `pg_dump` skema dengan menjalankan migrasi berurutan: harus identik.
- **Uji unit & CI**: `npm test` (49 uji: ekspor CSV, olah CSV import warga, PIN awal, batas login, unduh foto tautan, dst.) (ekspor CSV: angka negatif tetap angka, rumus berbahaya dinetralkan, tanggal memakai jam lokal) dan `npm run test:db` (uji RLS, butuh `PGURL`). Berkas `.github/workflows/ci.yml` menjalankan keduanya plus `npm run build` pada setiap push dan pull request.

**Batasan pengujian yang jujur:** pengujian di atas memakai Postgres, GoTrue (Supabase Auth), dan PostgREST asli, tetapi **Supabase Storage dan Realtime diganti stub sederhana** yang menjalankan kebijakan RLS `storage.objects` dari SQL yang sama. Aplikasi belum dicoba langsung di proyek Supabase Anda sendiri. Karena itu lakukan pengujian manual berikut sebagai penerimaan, terutama unggah foto, ubah PIN, dan notifikasi realtime.

Pengujian manual setelah deploy (disarankan):
1. Daftar dengan HP lain → muncul di Verifikasi Anggota → setujui → warga bisa masuk.
2. Bendahara: Kelola IPL > Tagihan per Periode > Terbitkan Tagihan.
3. Warga: IPL > Bayar Sekarang > unggah foto > Kirim. Bendahara: Terima → cek menu Keuangan.
4. Coba buka `/admin` dengan akun warga biasa: muncul keterangan "Halaman ini khusus pengurus berwenang".
8. Bendahara mencatat pengeluaran Rp 1.500.000 → Ketua menerima notifikasi → setujui di **Kas paguyuban > Persetujuan** → saldo berkurang.
9. Humas Jl. Zamrud membuat pengumuman "Hanya Jl. Zamrud" → hanya warga Jl. Zamrud yang menerima notifikasi, warga Jl. Safir di blok yang sama tidak.
5. Pengaturan > Keamanan: ubah PIN, keluar, masuk lagi dengan PIN baru.
6. Ubah Profil: unggah foto profil dan pastikan tampil.
7. Buat pengumuman dari akun admin; akun warga harus menerima notifikasi.

## 10. Keamanan

- **Kunci**: hanya `anon/publishable` key di frontend. `service_role` tidak dipakai di mana pun.
- **RLS aktif di semua tabel**; peran dicek lewat fungsi `is_aktif/is_pengurus/is_bendahara/is_admin`. Kolom peran/status/rumah dilindungi trigger sehingga warga tidak bisa menaikkan hak sendiri.
- **Data pribadi**: nomor HP & email ada di tabel terpisah (`warga_kontak`) yang hanya dibaca pemilik dan pengurus. Warga lain melihatnya hanya jika pemilik mengizinkan (menu Privasi).
- **Operasi sensitif lewat fungsi database** (`SECURITY DEFINER`, `search_path` dikunci): persetujuan, verifikasi pembayaran, penerbitan tagihan, reset PIN, hapus akun. Pembayaran tidak bisa dibuat langsung ke tabel.
- **PIN awal acak**: import/tambah warga membuat PIN 6 angka acak per akun (pgcrypto), tidak ada PIN seragam; PIN hanya tampil sekali dan tidak dicatat. **Batas percobaan login**: lihat migrasi 14 (lapis aplikasi + hook server opsional).
- **File**: bucket `bukti` & `konten` privat, diakses lewat signed URL berumur 1 jam; batas 3 MB dan hanya JPG/PNG/WEBP (+PDF untuk bukti). Foto dikompres di perangkat sebelum diunggah. Bucket `publik` hanya untuk foto lingkungan dan QRIS (kebijakan membatasi folder). Foto profil dari tautan luar disalin ke penyimpanan sendiri bila situs asal mengizinkan.
- **Validasi**: di formulir (UX) dan di database (`CHECK`, regex, panjang maksimum) sehingga tetap aman bila API dipanggil langsung.
- **Header**: CSP, X-Frame-Options, HSTS, dan lainnya lewat `public/_headers`.
- Disarankan: aktifkan **2FA** pada akun Supabase, GitHub, dan Cloudflare; batasi akses ke dashboard Supabase hanya untuk pengelola.

## 11. Batasan paket gratis

Angka berikut adalah ketentuan yang berlaku saat dokumen ini dibuat; **periksa halaman harga masing-masing** karena dapat berubah.

| Layanan | Batas gratis yang relevan | Dampak |
|---|---|---|
| **Supabase Free** | Database 500 MB, Storage 1 GB, transfer 5 GB/bulan, 50.000 pengguna aktif bulanan, ukuran upload maks. 50 MB per file | Cukup untuk ratusan KK. Foto dikompres (±100–300 KB) agar muat |
| | **Project di-pause bila tidak ada aktivitas ±1 minggu** | Selama dipakai warga tidak terjadi. Bila ter-pause, tekan *Restore* di dashboard |
| | Tidak ada backup otomatis yang bisa dipulihkan sendiri di paket gratis | Ekspor rutin: **Table Editor > Export CSV**, atau `pg_dump` dari *Connect* |
| | SMS OTP butuh penyedia berbayar | Itu sebabnya login memakai nomor HP + PIN |
| **Cloudflare Pages Free** | 500 build/bulan, 1 build berjalan, bandwidth situs statis tanpa batas | Lebih dari cukup |
| **GitHub Free** | Repository privat tak terbatas | Cukup |
| **Open-Meteo** (cuaca di dashboard) | Gratis tanpa kunci untuk pemakaian non-komersial | Jika gagal, widget cuaca disembunyikan |
| **Domain** | Biaya registrasi domain **tidak gratis** (sekitar tahunan) | Cloudflare Pages tidak mengenakan biaya untuk menyambungkan domain |

Hosting dan database tetap Rp0 selama pemakaian di bawah batas di atas.

## 12. Pemeliharaan & pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| Layar "Aplikasi belum dikonfigurasi" | Variabel `VITE_*` belum diisi. Setelah mengubah variabel di Cloudflare, jalankan **Retry deployment** karena nilainya dipasang saat build |
| "Akun belum dikonfirmasi" saat daftar | Matikan **Confirm email** (bagian 3.2) |
| "Domain akun internal ditolak" (`email_address_invalid`) | Ganti `VITE_AUTH_EMAIL_DOMAIN` dengan subdomain dari domain asli yang Anda miliki |
| Pendaftar tidak muncul di Verifikasi | Pastikan SQL `01-skema.sql` sukses dijalankan (trigger `on_auth_user_created`) |
| "Anda tidak memiliki akses" | Peran belum sesuai (mis. belum jadi bendahara) atau akun belum aktif |
| Gambar tidak tampil | Cek bucket & kebijakan Storage; pastikan `01-skema.sql` dijalankan penuh |
| Halaman 404 saat refresh | Pastikan `wrangler.jsonc` ikut ter-deploy dan memuat `not_found_handling: single-page-application` |
| Notifikasi tidak realtime | Cek **Database > Replication**: tabel `notifikasi` harus ada di publikasi `supabase_realtime`. Aplikasi tetap memperbarui lencana saat jendela aktif kembali dan tiap 2 menit |

**Pembaruan aplikasi:** ubah kode → `git push` → Cloudflare membangun otomatis.
**Pembaruan skema:** tambahkan berkas SQL baru (mis. `supabase/03-….sql`) dan jalankan di SQL Editor; simpan di repository sebagai riwayat.
