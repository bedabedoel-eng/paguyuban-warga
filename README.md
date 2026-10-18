# Paguyuban Warga Digital

Aplikasi paguyuban warga (satu lingkungan/RT) berbasis **React + Vite**, **Supabase** (Auth, PostgreSQL, Storage) dan di-hosting di **Cloudflare Pages**. Seluruhnya memakai paket gratis.

**Fitur:** login nomor HP + PIN 6 angka (opsional Google), pendaftaran dengan persetujuan pengurus, direktori & profil warga, tagihan IPL, unggah bukti transfer, verifikasi bendahara, kas/keuangan transparan, pengumuman, kegiatan dengan kalender dan pendaftaran peserta, aspirasi & laporan, notifikasi realtime, pengurus, panel admin, dashboard desktop dan HP.

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

| Peran | Cara didapat | Bisa |
|---|---|---|
| **Warga** | Daftar lalu disetujui pengurus | Lihat direktori, tagihan rumahnya sendiri, kas, pengumuman, kegiatan; kirim bukti bayar & laporan |
| **Pengurus** | Admin menambahkan jabatan ke seorang warga (menu Admin > Data Warga > Ubah) | Verifikasi anggota, buat pengumuman & kegiatan, tanggapi laporan, lihat data warga |
| **Bendahara** | Pengurus berjabatan mengandung kata *Bendahara* atau *Ketua* (atau Admin) | Terbitkan tagihan IPL, verifikasi bukti, catat tunai, kelola kas, data rumah |
| **Admin** | Dijadikan admin lewat SQL (lihat bagian 5) | Semua di atas + ubah data/peran/nomor HP warga, atur ulang PIN, hapus akun, pengaturan paguyuban |

Semua aturan ini ditegakkan **di database (RLS)**, bukan hanya di tampilan. Kunci yang ada di frontend hanyalah kunci publik (anon/publishable).

## 2. Struktur folder

```
paguyuban-warga/
├─ supabase/
│  ├─ 01-skema.sql        # tabel, fungsi, trigger, RLS, storage (jalankan sekali)
│  ├─ 02-data-awal.sql    # profil paguyuban, blok, kontak darurat (sesuaikan)
│  ├─ 03-pin-angka.sql    # aturan PIN 6 angka (jalankan setelah 01)
│  └─ 04-import-warga.sql # import warga massal + wajib ganti PIN (setelah 03)
├─ public/                # favicon, manifest PWA, _redirects, _headers (Cloudflare)
├─ src/
│  ├─ main.jsx, App.jsx   # entry + seluruh rute
│  ├─ routes/guards.jsx   # penjaga rute (login, aktif, pengurus, bendahara, admin)
│  ├─ context/            # Auth, Pengaturan, Toast, Notifikasi
│  ├─ lib/                # supabase client, format, nomor HP, upload & kompres foto, galat
│  ├─ services/           # semua akses data Supabase, satu file per domain
│  ├─ hooks/              # useAsync, useDebounce, useMediaQuery
│  ├─ components/
│  │  ├─ ui/              # Button, Field, Card, Modal, Tabs, ImagePicker, dst. (reusable)
│  │  ├─ layout/          # Sidebar, Topbar, BottomNav, PageHeader, AppShell
│  │  └─ illustrations/   # Logo dan ilustrasi perumahan (SVG)
│  ├─ features/           # satu folder per modul layar
│  │  ├─ auth/ beranda/ warga/ ipl/ keuangan/ pengumuman/ kegiatan/
│  │  └─ laporan/ pengurus/ profil/ pengaturan/ menu/ notifikasi/ admin/
│  └─ styles/             # tokens (warna), base, components, layout, auth, pages
├─ .env.example
└─ vite.config.js
```

Menambah modul baru: buat tabel + kebijakan RLS di SQL, tambahkan `src/services/<modul>.js`, buat layar di `src/features/<modul>/`, daftarkan rute di `App.jsx`.

## 3. Setup Supabase (±15 menit)

1. Daftar di <https://supabase.com> dan klik **New project** (pilih region terdekat, mis. *Southeast Asia (Singapore)*). Simpan *database password*.
2. **Atur autentikasi** (penting):
   - **Authentication > Sign In / Providers > Email**: biarkan *Enable Email provider* aktif, **matikan "Confirm email"**. Aplikasi memakai email internal `628xxx@domain-anda` hanya sebagai penampung nomor HP, tidak ada email yang dikirim.
   - Di bagian yang sama atur **Minimum password length = 6** (PIN warga terdiri dari 6 angka; nilai 8 akan membuat pendaftaran gagal).
   - **Authentication > URL Configuration**: *Site URL* = `https://domain-anda.id` (isi setelah domain siap; sementara boleh `http://localhost:5173`). Tambahkan di *Redirect URLs*: `http://localhost:5173/**` dan `https://domain-anda.id/**`.
3. **Jalankan SQL**: buka **SQL Editor > New query**.
   - Tempel isi `supabase/01-skema.sql` lalu **Run**. Aman dijalankan ulang.
   - Tempel isi `supabase/03-pin-angka.sql` lalu **Run** (mengubah aturan sandi menjadi PIN 6 angka; **wajib** dijalankan setelah `01`).
   - Tempel isi `supabase/04-import-warga.sql` lalu **Run** (import warga massal dan kewajiban ganti PIN). **Jalankan sebelum men-deploy versi aplikasi yang memakainya.**
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
| `VITE_AUTH_EMAIL_DOMAIN` | domain email internal, mis. `akun.paguyubananda.id`. Pakai subdomain dari domain Anda sendiri. **Jangan diubah setelah ada warga mendaftar.** |
| `VITE_GOOGLE_LOGIN` | `true` bila login Google sudah diaktifkan (bagian 6), selain itu `false` |

Perintah lain: `npm run build` (hasil di `dist/`), `npm run preview` (uji hasil build).

## 5. Membuat admin pertama

1. Buka aplikasi, klik **Daftar**, isi data Anda sendiri. Anda akan melihat layar "Menunggu Persetujuan".
2. Di Supabase **SQL Editor**, jalankan (ganti dengan nomor HP Anda):
   ```sql
   select public.jadikan_admin('081234567890');
   ```
   Hasilnya `Berhasil: akun sekarang Admin aktif.`
3. Di aplikasi tekan **Periksa status** atau muat ulang. Anda masuk sebagai admin dan melihat menu **Panel Admin**.
4. Mulai sekarang pendaftar baru muncul di **Admin > Verifikasi Anggota**. Tambahkan pengurus lewat **Data Warga > Ubah > Jabatan Pengurus**.

Fungsi `jadikan_admin` tidak dapat dipanggil dari aplikasi, hanya dari SQL Editor.

**Import warga massal:** masuk sebagai admin > **Warga > Import Warga**. Unduh contoh CSV, isi kolom `nama, hp, blok, no_rumah` (opsional `pekerjaan`, `kepala_keluarga` ya/tidak), unggah, periksa pratinjau, lalu **Buat Akun**. Semua akun langsung aktif dengan PIN awal `123456`, dan warga otomatis diminta membuat PIN baru saat pertama masuk (layar *Buat PIN Baru*). Warga yang belum mengganti PIN ditandai di **Data Warga** (filter *Belum ganti PIN*). Satu nomor HP hanya untuk satu akun; baris dengan nomor ganda atau blok tak dikenal dilewati dan dilaporkan. Uji dulu dengan 2-3 baris.

**Lupa PIN:** karena tidak memakai SMS/email, warga menghubungi admin. Admin membuka **Data Warga > Ubah > Atur Ulang PIN**, mengisi PIN sementara (6 angka). Warga otomatis diminta membuat PIN baru saat masuk.

## 6. Login Google (opsional)

1. <https://console.cloud.google.com> > buat project > **APIs & Services > OAuth consent screen** (External, isi nama aplikasi & email) > **Credentials > Create credentials > OAuth client ID** > *Web application*.
2. **Authorized redirect URI**: salin dari Supabase **Authentication > Providers > Google** (bentuknya `https://xxxx.supabase.co/auth/v1/callback`).
3. Salin *Client ID* dan *Client Secret* ke form Google di Supabase, aktifkan, simpan. (Secret hanya diisi di dashboard Supabase, bukan di aplikasi.)
4. Set `VITE_GOOGLE_LOGIN=true` (lokal dan di Cloudflare), lalu build ulang.

Pendaftar Google diminta melengkapi **nomor HP, blok, dan nomor rumah**, lalu tetap menunggu persetujuan pengurus.

## 7. GitHub

```bash
cd paguyuban-warga
git init
git add .
git commit -m "Paguyuban Warga Digital"
git branch -M main
git remote add origin https://github.com/<akun-anda>/paguyuban-warga.git
git push -u origin main
```

Buat repository kosong terlebih dahulu di GitHub (disarankan **Private**). `.gitignore` sudah mengecualikan `.env.local` dan `node_modules`. Jangan pernah meng-commit file `.env*` berisi kunci.

## 8. Deploy ke Cloudflare Pages + domain sendiri

1. <https://dash.cloudflare.com> > **Workers & Pages > Create > Pages > Connect to Git** > pilih repository.
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
6. Berkas `public/_redirects` membuat semua rute (mis. `/ipl`) tetap terbuka saat halaman di-refresh. Berkas `public/_headers` memasang header keamanan dan *Content-Security-Policy*. Bila Anda memakai domain Supabase kustom atau layanan luar lain, tambahkan ke `connect-src`/`img-src` di berkas itu.

## 9. Pengujian

Yang sudah diuji pada pengembangan (stack Postgres + GoTrue + PostgREST asli, dengan penegakan RLS):

- **67 pemeriksaan database**: warga menunggu tidak melihat data, tidak bisa menaikkan peran sendiri, privasi nomor HP, isolasi tagihan antar rumah, bukti transfer hanya terbaca pemilik/bendahara, unggah ke folder orang lain ditolak, verifikasi → lunas → kas otomatis, kuota kegiatan, laporan hanya terlihat pelapor/pengurus, admin terakhir tidak bisa diturunkan, anon tidak bisa membaca data pribadi.
- **60 pemeriksaan halaman** (30 rute × desktop & HP): tanpa galat dan tanpa scroll horizontal.
- **21 pemeriksaan alur browser**: daftar → menunggu → disetujui → tagihan terbit → bayar + unggah bukti → verifikasi → kas bertambah → pembatasan rute per peran → laporan dengan foto.

**Batasan pengujian yang jujur:** pengujian di atas memakai Postgres, GoTrue (Supabase Auth), dan PostgREST asli, tetapi **Supabase Storage dan Realtime diganti stub sederhana** yang menjalankan kebijakan RLS `storage.objects` dari SQL yang sama. Aplikasi belum dicoba langsung di proyek Supabase Anda sendiri. Karena itu lakukan pengujian manual berikut sebagai penerimaan, terutama unggah foto, ubah PIN, dan notifikasi realtime.

Pengujian manual setelah deploy (disarankan):
1. Daftar dengan HP lain → muncul di Verifikasi Anggota → setujui → warga bisa masuk.
2. Bendahara: Kelola IPL > Tagihan per Periode > Terbitkan Tagihan.
3. Warga: IPL > Bayar Sekarang > unggah foto > Kirim. Bendahara: Terima → cek menu Keuangan.
4. Coba buka `/admin` dengan akun warga biasa: harus dialihkan ke beranda.
5. Pengaturan > Keamanan: ubah PIN, keluar, masuk lagi dengan PIN baru.
6. Ubah Profil: unggah foto profil dan pastikan tampil.
7. Buat pengumuman dari akun admin; akun warga harus menerima notifikasi.

## 10. Keamanan

- **Kunci**: hanya `anon/publishable` key di frontend. `service_role` tidak dipakai di mana pun.
- **RLS aktif di semua tabel**; peran dicek lewat fungsi `is_aktif/is_pengurus/is_bendahara/is_admin`. Kolom peran/status/rumah dilindungi trigger sehingga warga tidak bisa menaikkan hak sendiri.
- **Data pribadi**: nomor HP & email ada di tabel terpisah (`warga_kontak`) yang hanya dibaca pemilik dan pengurus. Warga lain melihatnya hanya jika pemilik mengizinkan (menu Privasi).
- **Operasi sensitif lewat fungsi database** (`SECURITY DEFINER`, `search_path` dikunci): persetujuan, verifikasi pembayaran, penerbitan tagihan, reset PIN, hapus akun. Pembayaran tidak bisa dibuat langsung ke tabel.
- **File**: bucket `bukti` & `konten` privat, diakses lewat signed URL berumur 1 jam; batas 3 MB dan hanya JPG/PNG/WEBP (+PDF untuk bukti). Foto dikompres di perangkat sebelum diunggah.
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
| Halaman 404 saat refresh | Pastikan `public/_redirects` ikut ter-deploy |
| Notifikasi tidak realtime | Cek **Database > Replication**: tabel `notifikasi` harus ada di publikasi `supabase_realtime`. Aplikasi tetap memperbarui lencana saat jendela aktif kembali dan tiap 2 menit |

**Pembaruan aplikasi:** ubah kode → `git push` → Cloudflare membangun otomatis.
**Pembaruan skema:** tambahkan berkas SQL baru (mis. `supabase/03-….sql`) dan jalankan di SQL Editor; simpan di repository sebagai riwayat.
