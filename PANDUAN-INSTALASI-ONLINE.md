# Panduan Instalasi Online: Paguyuban Warga Digital

Panduan ini memasang aplikasi **dari nol sampai bisa dipakai warga**, seluruhnya lewat **browser**. Tidak perlu memasang Node.js, Git, VS Code, atau program apa pun di laptop.

Biaya hosting Rp0. Yang berbayar hanya domain sendiri (opsional).

Kerjakan tahap demi tahap secara berurutan. Setiap tahap diakhiri **✅ Titik periksa**. Pastikan titik periksa terpenuhi sebelum lanjut ke tahap berikutnya.

---

## Daftar isi

- [Gambaran besar](#gambaran-besar)
- [Tahap 0. Persiapan](#tahap-0-persiapan)
- [Tahap 1. Buat proyek Supabase](#tahap-1-buat-proyek-supabase)
- [Tahap 2. Atur login di Supabase](#tahap-2-atur-login-di-supabase)
- [Tahap 3. Pasang database (SQL)](#tahap-3-pasang-database-sql)
- [Tahap 4. Catat dua kunci Supabase](#tahap-4-catat-dua-kunci-supabase)
- [Tahap 5. Unggah kode ke GitHub](#tahap-5-unggah-kode-ke-github)
- [Tahap 6. Terbitkan di Cloudflare Pages](#tahap-6-terbitkan-di-cloudflare-pages)
- [Tahap 7. Sambungkan alamat situs ke Supabase](#tahap-7-sambungkan-alamat-situs-ke-supabase)
- [Tahap 8. Buat admin pertama](#tahap-8-buat-admin-pertama)
- [Tahap 9. Uji akhir](#tahap-9-uji-akhir)
- [Tahap 10. Pasang domain sendiri (opsional)](#tahap-10-pasang-domain-sendiri-opsional)
- [Tahap 11. Login Google (opsional)](#tahap-11-login-google-opsional)
- [Cara mengubah aplikasi setelah online](#cara-mengubah-aplikasi-setelah-online)
- [Pemecahan masalah](#pemecahan-masalah)
- [Batas paket gratis](#batas-paket-gratis)
- [Lampiran: Prompt untuk melanjutkan dengan Claude](#lampiran-prompt-untuk-melanjutkan-dengan-claude)

---

## Gambaran besar

Aplikasi ini memakai tiga layanan online gratis yang saling tersambung:

```
 ┌──────────────┐      kode       ┌──────────────────┐     tampil ke     ┌────────┐
 │    GitHub    │ ──────────────▶ │ Cloudflare Pages │ ────────────────▶ │ Warga  │
 │ (simpan kode)│   otomatis      │ (bangun & hosting)│   https://...     │ (HP/PC)│
 └──────────────┘                 └──────────────────┘                   └────────┘
                                           │  baca/tulis data
                                           ▼
                                  ┌──────────────────┐
                                  │     Supabase     │
                                  │ (login, database,│
                                  │   foto/berkas)   │
                                  └──────────────────┘
```

| Layanan | Fungsinya | Ibaratnya |
|---|---|---|
| **Supabase** | Menyimpan akun, data warga, IPL, pengumuman, dan foto | Lemari arsip |
| **GitHub** | Menyimpan kode aplikasi | Gudang cetak biru |
| **Cloudflare Pages** | Mengubah kode menjadi situs yang bisa dibuka warga | Toko yang memajang aplikasi |

Urutan kerja:

```
Persiapan → Supabase (Tahap 1–4) → GitHub (5) → Cloudflare (6)
          → Sambungkan alamat (7) → Admin pertama (8) → Uji (9) → Domain (10)
```

Perkiraan waktu: **60–90 menit** untuk pemula.

---

## Tahap 0. Persiapan

### 0.1 Yang dibutuhkan

| Kebutuhan | Keterangan |
|---|---|
| Laptop/PC dengan **Google Chrome** atau **Microsoft Edge** | Hanya untuk browser. Mengunggah folder ke GitHub paling mudah dari Chrome/Edge di komputer, bukan dari HP |
| File **`paguyuban-warga.zip`** | Berisi seluruh kode aplikasi |
| Alamat email aktif | Untuk mendaftar tiga layanan di bawah |
| Pengelola kata sandi atau catatan aman | Untuk menyimpan kata sandi dan kunci |

### 0.2 Buat tiga akun (gratis)

1. **Supabase**: <https://supabase.com> → **Start your project**. Bisa daftar dengan akun GitHub.
2. **GitHub**: <https://github.com/signup>.
3. **Cloudflare**: <https://dash.cloudflare.com/sign-up>.

> 🔒 **Sangat disarankan:** aktifkan verifikasi dua langkah (2FA) di ketiga akun. Akun-akun ini memegang data seluruh warga.

### 0.3 Ekstrak file zip

1. Klik kanan `paguyuban-warga.zip` → **Extract All** (Windows) atau klik dua kali (Mac).
2. Buka folder hasil ekstrak. Di dalamnya harus terlihat, antara lain:
   - `package.json`
   - `index.html`
   - folder `src`, `public`, `supabase`
   - `README.md`

> ⚠️ Kalau setelah dibuka isinya hanya **satu folder lagi** (mis. `paguyuban-warga`), masuk ke folder itu. Yang dipakai adalah folder yang **langsung** berisi `package.json`.

### 0.4 Siapkan catatan

Buat satu catatan (Notepad, Google Keep, atau pengelola kata sandi) dengan isian berikut. Kita akan mengisinya di tahap-tahap selanjutnya.

```
SUPABASE
  Database password   : ...............
  Project URL         : https://..........supabase.co
  Anon/Publishable key: ...............

APLIKASI
  Domain email akun   : akun.................   (Tahap 6)
  Alamat situs        : https://..........pages.dev
  Nomor HP admin      : 08..........
```

✅ **Titik periksa:** Anda sudah punya akun Supabase, GitHub, dan Cloudflare, dan folder hasil ekstrak berisi `package.json`.

---

## Tahap 1. Buat proyek Supabase

1. Masuk ke <https://supabase.com/dashboard>.
2. Klik **New project**. Jika diminta membuat *organization*, isi nama (mis. nama paguyuban) dan pilih paket **Free**.
3. Isi formulir:
   | Kolom | Isi |
   |---|---|
   | Project name | mis. `paguyuban-warga` |
   | Database password | Klik **Generate a password**, lalu **salin ke catatan** |
   | Region | **Southeast Asia (Singapore)**, paling dekat dengan Indonesia |
4. Klik **Create new project**, lalu tunggu 1–2 menit hingga proyek siap.

✅ **Titik periksa:** dashboard proyek terbuka tanpa tulisan "Setting up project".

---

## Tahap 2. Atur login di Supabase

Aplikasi ini memakai **nomor HP + kata sandi**. Di belakang layar, nomor HP disimpan dalam bentuk email internal (mis. `6281234567890@akun.domainanda.id`). **Tidak ada email yang dikirim ke warga**, jadi konfirmasi email harus dimatikan.

1. Di menu kiri, klik **Authentication** → **Sign In / Providers** (di beberapa versi: **Providers**).
2. Klik **Email**, lalu atur:
   | Pengaturan | Nilai |
   |---|---|
   | Enable Email provider | **Aktif** |
   | Confirm email | **MATI** ← wajib. Kalau aktif, pendaftaran warga gagal |
   | Minimum password length | **8** |
3. Klik **Save**.

> Pengaturan alamat situs (*URL Configuration*) dikerjakan nanti di **Tahap 7**, setelah alamat situs dari Cloudflare didapat.

✅ **Titik periksa:** di halaman Email provider, *Confirm email* dalam keadaan **mati**.

---

## Tahap 3. Pasang database (SQL)

Di tahap ini kita membuat tabel, aturan keamanan, dan tempat penyimpanan foto dengan menempelkan dua file SQL.

### 3.1 Jalankan file skema

1. Di folder hasil ekstrak, buka folder `supabase`.
2. Buka file **`01-skema.sql`** dengan **Notepad** (klik kanan → *Open with* → Notepad) atau TextEdit di Mac.
3. Tekan **Ctrl+A** (pilih semua), lalu **Ctrl+C** (salin). Di Mac: **Cmd+A**, **Cmd+C**.
4. Di Supabase, klik **SQL Editor** di menu kiri → **New query**.
5. Tempel dengan **Ctrl+V**, lalu klik **Run** (atau tekan Ctrl+Enter).
6. Tunggu sampai muncul **Success. No rows returned** atau pesan sukses lain.

> Jika muncul peringatan "*This query has destructive operations*", klik **Run this query**. File ini aman dijalankan ulang.

### 3.2 Sesuaikan dan jalankan data awal

1. Buka file **`02-data-awal.sql`** dengan Notepad.
2. **Ubah** bagian berikut sesuai paguyuban Anda (cari teks di antara tanda kutip `'...'`):
   - Nama paguyuban, RT/RW, alamat
   - Tarif IPL dan nomor rekening
   - Daftar blok (mis. `A`, `B`, `C`)
   - Kontak darurat (satpam, RT, puskesmas, dll.)

   > Hati-hati: jangan menghapus tanda kutip `'`, koma `,`, atau tanda kurung. Ubah **hanya teks di dalam kutip**. Semua isian ini juga bisa diubah lagi nanti dari menu Admin.
3. Salin seluruh isinya, buka **New query** baru di SQL Editor, tempel, lalu **Run**.

✅ **Titik periksa:**
- Menu **Table Editor** menampilkan tabel seperti `warga`, `rumah`, `tagihan_ipl`, `pengumuman`.
- Menu **Storage** menampilkan bucket `publik`, `konten`, dan `bukti`.

---

## Tahap 4. Catat dua kunci Supabase

1. Klik ikon **⚙ Project Settings** (kiri bawah) → **API Keys** (di beberapa versi: **API** atau **Data API**).
2. Salin ke catatan Anda:
   - **Project URL**, bentuknya `https://abcdxyz.supabase.co`. Kadang ada di **Project Settings → Data API**, atau tombol **Connect** di bagian atas dashboard.
   - **anon public** key, atau **Publishable key** (diawali `sb_publishable_...`).

> 🚫 **JANGAN** menyalin atau memakai kunci **`service_role`** atau **Secret key** di mana pun. Aplikasi tidak memerlukannya, dan kunci itu bisa membuka seluruh data. Kunci *anon/publishable* aman dipakai di aplikasi karena data dilindungi aturan keamanan database (RLS).

✅ **Titik periksa:** di catatan Anda sudah ada **Project URL** dan **anon/publishable key**.

---

## Tahap 5. Unggah kode ke GitHub

### 5.1 Buat repository

1. Buka <https://github.com/new>.
2. Isi:
   | Kolom | Isi |
   |---|---|
   | Repository name | `paguyuban-warga` |
   | Visibility | **Private** |
   | Add a README file | **Jangan** dicentang |
   | Add .gitignore / license | **None** |
3. Klik **Create repository**.

### 5.2 Unggah file

1. Di halaman repository yang masih kosong, klik tautan **uploading an existing file** (atau **Add file → Upload files**).
2. Buka folder hasil ekstrak (yang berisi `package.json`) di File Explorer/Finder.
3. Pilih **semua isi** folder itu (**Ctrl+A**), lalu **seret** ke kotak unggah di GitHub.

   > ⚠️ Seret **isinya**, bukan foldernya. Setelah diunggah, `package.json` harus berada di **halaman utama** repository, bukan di dalam subfolder.
4. Tunggu sampai semua file selesai terunggah dan muncul di daftar.
5. Di kotak **Commit changes** bawah, tulis `Unggah awal aplikasi`, lalu klik **Commit changes**.

**Jika jumlah file lebih dari 100:** GitHub hanya menerima 100 file sekali unggah. Unggah bertahap: misalnya folder `src` dulu, lalu folder lain dan file di halaman utama. Setiap kali selesai, klik **Commit changes**, lalu **Add file → Upload files** lagi.

**File yang namanya diawali titik** (`.gitignore`, `.env.example`) kadang tidak ikut terunggah karena tersembunyi. **Tidak masalah**, aplikasi tetap berjalan. Di Mac, file tersembunyi bisa ditampilkan dengan **Cmd+Shift+.** di Finder.

> 🚫 Jangan pernah mengunggah file bernama `.env.local` atau berisi kunci rahasia. Zip ini memang tidak memuatnya.

✅ **Titik periksa:** di halaman utama repository terlihat `package.json`, `index.html`, folder `src`, `public`, `supabase`. Di dalam folder `public` ada file `_redirects`.

---

## Tahap 6. Terbitkan di Cloudflare Pages

Cloudflare akan mengambil kode dari GitHub, membangunnya menjadi situs, dan memberinya alamat `https://....pages.dev`.

### 6.1 Tentukan domain email akun

Aplikasi butuh satu nilai bernama `VITE_AUTH_EMAIL_DOMAIN`. Nilai ini hanya penanda di belakang layar untuk menyimpan nomor HP sebagai email.

- **Jika punya domain** (mis. `paguyubananda.id`): pakai subdomainnya, mis. `akun.paguyubananda.id`.
- **Jika belum punya domain:** pakai nama proyek Cloudflare yang akan Anda buat, mis. `akun.paguyuban-warga.pages.dev`.

> ⚠️ **Nilai ini tidak boleh diubah setelah ada warga yang mendaftar.** Kalau diubah, warga lama tidak bisa masuk. Pilih sekali dengan tenang, lalu catat. Jangan memakai domain palsu seperti `.local` karena ditolak Supabase.

### 6.2 Buat proyek Pages

1. Masuk ke <https://dash.cloudflare.com>.
2. Di menu kiri, klik **Workers & Pages** (di beberapa versi: **Compute → Workers & Pages**).
3. Klik **Create** (atau **Create application**), lalu pilih tab **Pages**.
4. Klik **Import an existing Git repository** (atau **Connect to Git**).
   > Pastikan memilih **Pages**, bukan **Workers**.
5. Klik **Connect GitHub**. Jendela GitHub terbuka:
   - Pilih akun Anda.
   - Pilih **Only select repositories** → pilih `paguyuban-warga`.
   - Klik **Install & Authorize**.
6. Kembali di Cloudflare, pilih repository `paguyuban-warga` → **Begin setup**.

### 6.3 Isi pengaturan build

| Kolom | Isi |
|---|---|
| Project name | `paguyuban-warga` (ini menjadi alamat `paguyuban-warga.pages.dev`) |
| Production branch | `main` |
| Framework preset | **Vite** (atau **None**) |
| Build command | `npm run build` |
| Build output directory | `dist` |

### 6.4 Isi Environment variables

Masih di halaman yang sama, buka **Environment variables (advanced)** → **Add variable**, lalu tambahkan **lima** variabel ini satu per satu:

| Variable name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL dari Tahap 4 |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key dari Tahap 4 |
| `VITE_AUTH_EMAIL_DOMAIN` | Nilai dari Tahap 6.1, mis. `akun.paguyubananda.id` |
| `VITE_GOOGLE_LOGIN` | `false` |
| `NODE_VERSION` | `20` |

> Ketik nama variabel **persis** seperti di tabel, huruf besar semua, tanpa spasi. Salah satu huruf saja membuat aplikasi tidak tersambung.

### 6.5 Terbitkan

1. Klik **Save and Deploy**.
2. Tunggu proses build (2–5 menit). Akan muncul log berjalan; tunggu sampai tertulis **Success**.
3. Catat alamat situs Anda, mis. `https://paguyuban-warga.pages.dev`.

✅ **Titik periksa:** alamat `.pages.dev` bisa dibuka dan menampilkan **halaman Masuk** aplikasi.

> Jika muncul tulisan **"Aplikasi belum dikonfigurasi"**, ada variabel yang salah atau kosong. Perbaiki di **Settings → Environment variables** (pastikan untuk **Production**), lalu buka **Deployments** → titik tiga pada deployment teratas → **Retry deployment**.

---

## Tahap 7. Sambungkan alamat situs ke Supabase

Supabase perlu tahu alamat situs Anda agar login dan pengalihan halaman berjalan.

1. Di Supabase, buka **Authentication → URL Configuration**.
2. Isi:
   | Kolom | Isi |
   |---|---|
   | Site URL | `https://paguyuban-warga.pages.dev` (alamat Anda) |
   | Redirect URLs → **Add URL** | `https://paguyuban-warga.pages.dev/**` |
3. Klik **Save**.

✅ **Titik periksa:** Site URL berisi alamat `.pages.dev` Anda, dan alamat yang sama dengan akhiran `/**` ada di Redirect URLs.

---

## Tahap 8. Buat admin pertama

Admin pertama dibuat lewat SQL, demi keamanan. Tidak ada tombol "jadikan admin" di aplikasi.

1. Buka alamat situs Anda, lalu klik **Daftar**.
2. Isi data **Anda sendiri**, termasuk nomor HP dan kata sandi, lalu kirim.
3. Muncul layar **"Menunggu Persetujuan"**. Ini normal.
4. Di Supabase, buka **SQL Editor → New query**, lalu tempel (ganti dengan nomor HP yang tadi Anda daftarkan):

   ```sql
   select public.jadikan_admin('081234567890');
   ```
5. Klik **Run**. Hasil yang benar: `Berhasil: akun sekarang Admin aktif.`
6. Kembali ke aplikasi, lalu tekan **Periksa status** atau muat ulang halaman.

✅ **Titik periksa:** Anda melihat **Beranda** dan menu **Panel Admin**.

> Setelah ini, warga lain cukup **Daftar** sendiri. Mereka akan muncul di **Panel Admin → Verifikasi Anggota** untuk Anda setujui.

---

## Tahap 9. Uji akhir

Uji di **dua perangkat**, misalnya laptop sebagai admin dan HP sebagai warga. Centang setiap baris yang berhasil.

| No | Uji | Hasil yang diharapkan |
|---|---|---|
| ☐ 1 | Daftar dengan nomor HP lain (akun warga uji) | Muncul di **Verifikasi Anggota**. Setelah **Setujui**, warga uji bisa masuk |
| ☐ 2 | Admin/Bendahara: **Kelola IPL → Tagihan per Periode → Terbitkan Tagihan** | Tagihan muncul di akun warga uji |
| ☐ 3 | Warga: **IPL → Bayar Sekarang** → unggah foto bukti → **Kirim** | Bendahara melihat bukti, lalu **Terima**. Saldo di **Keuangan** bertambah |
| ☐ 4 | Warga uji membuka `.../admin` | Dialihkan ke Beranda (tidak bisa masuk admin) |
| ☐ 5 | **Pengaturan → Keamanan**: ubah kata sandi, keluar, lalu masuk lagi | Bisa masuk dengan kata sandi baru |
| ☐ 6 | **Ubah Profil**: unggah foto profil | Foto tampil |
| ☐ 7 | Admin membuat pengumuman | Warga uji menerima notifikasi |
| ☐ 8 | Buka halaman `/ipl`, lalu tekan refresh | Halaman tetap tampil, bukan error 404 |
| ☐ 9 | Buka di HP: Chrome → titik tiga → **Tambahkan ke layar utama** | Ikon aplikasi muncul di layar HP |

> Jika uji no. 7 gagal (notifikasi tidak muncul langsung): di Supabase buka **Database → Publications** (atau **Replication**) → `supabase_realtime`, lalu pastikan tabel `notifikasi` **aktif**.

✅ **Titik periksa:** semua baris tercentang. Aplikasi siap dibagikan ke warga.

---

## Tahap 10. Pasang domain sendiri (opsional)

Agar warga membuka `warga.paguyubananda.id`, bukan `....pages.dev`.

1. Beli domain (mis. di Niagahoster, Rumahweb, Domainesia, atau Cloudflare Registrar).
2. Di Cloudflare: **Workers & Pages** → proyek Anda → tab **Custom domains** → **Set up a custom domain**.
3. Ketik subdomain, mis. `warga.paguyubananda.id` → **Continue**.
4. Atur DNS:
   - **Domain sudah dikelola di Cloudflare:** catatan DNS dibuat otomatis, cukup klik **Activate domain**.
   - **Domain di penyedia lain:** masuk ke panel DNS penyedia domain, lalu tambahkan:
     | Type | Name/Host | Value/Target |
     |---|---|---|
     | CNAME | `warga` | `paguyuban-warga.pages.dev` |
5. Tunggu status **Active** (beberapa menit hingga 24 jam). HTTPS (gembok) aktif otomatis.
6. Di Supabase → **Authentication → URL Configuration**:
   - Ubah **Site URL** menjadi `https://warga.paguyubananda.id`
   - Tambahkan **Redirect URL** `https://warga.paguyubananda.id/**`. Alamat `.pages.dev` boleh tetap ada.

> Jangan ubah `VITE_AUTH_EMAIL_DOMAIN` meskipun sekarang sudah punya domain baru, bila sudah ada warga yang mendaftar.

✅ **Titik periksa:** `https://warga.paguyubananda.id` terbuka dengan gembok, dan login berhasil.

---

## Tahap 11. Login Google (opsional)

Menambahkan tombol **Masuk dengan Google**. Warga yang masuk lewat Google tetap diminta melengkapi nomor HP, blok, dan nomor rumah, lalu menunggu persetujuan.

1. Di Supabase: **Authentication → Sign In / Providers → Google**. Salin **Callback URL** (bentuknya `https://xxxx.supabase.co/auth/v1/callback`).
2. Buka <https://console.cloud.google.com>, lalu buat project baru.
3. **APIs & Services → OAuth consent screen** (di versi baru: **Google Auth Platform → Branding**): pilih **External**, isi nama aplikasi dan email, lalu simpan.
4. **Credentials → Create credentials → OAuth client ID** (versi baru: **Clients → Create client**):
   - Application type: **Web application**
   - Authorized redirect URIs: tempel **Callback URL** dari langkah 1
   - Klik **Create**, lalu salin **Client ID** dan **Client Secret**.
5. Kembali ke Supabase → Google provider: aktifkan, tempel Client ID dan Client Secret, lalu **Save**.
   > Client Secret **hanya** diisi di Supabase, tidak di Cloudflare dan tidak di kode.
6. Di Cloudflare → proyek → **Settings → Environment variables**: ubah `VITE_GOOGLE_LOGIN` menjadi `true`.
7. **Deployments → Retry deployment** pada deployment teratas.

✅ **Titik periksa:** tombol **Masuk dengan Google** tampil dan bisa dipakai.

---

## Cara mengubah aplikasi setelah online

Semua tetap lewat browser.

| Ingin mengubah | Caranya |
|---|---|
| Nama paguyuban, tarif IPL, blok, kontak, pengumuman | Lewat **Panel Admin** di aplikasi. Tidak perlu menyentuh kode |
| Satu file kode | Di GitHub, buka file → ikon ✏️ **Edit** → ubah → **Commit changes**. Cloudflare membangun ulang otomatis dalam 2–5 menit |
| Banyak file sekaligus | Di GitHub: **Add file → Upload files**, lalu seret file pengganti ke folder yang sama |
| Minta Claude yang mengubah | Sambungkan repository GitHub ke sesi Claude (lihat Lampiran). Claude bisa mengubah dan mengunggah langsung |
| Variabel `VITE_...` | Cloudflare → **Settings → Environment variables**, lalu **wajib Retry deployment** |
| Struktur database | Jalankan file SQL baru (`03-....sql`, dst.) di **SQL Editor**, berurutan |

**Mencoba perubahan tanpa langsung tampil ke warga:**
1. Di GitHub, saat **Commit changes**, pilih **Create a new branch** (mis. `coba`).
2. Cloudflare otomatis membuat alamat uji, mis. `https://coba.paguyuban-warga.pages.dev`. Lihat di **Deployments**.
   > Agar alamat uji bisa login, tambahkan `https://*.paguyuban-warga.pages.dev/**` di **Redirect URLs** Supabase, dan pastikan Environment variables juga diisi untuk **Preview**.
3. Bila sudah cocok, di GitHub buka **Pull requests → New** → gabungkan `coba` ke `main`.

---

## Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| **"Aplikasi belum dikonfigurasi"** | Variabel `VITE_...` kosong atau salah ketik. Perbaiki di Cloudflare, lalu **Retry deployment** |
| Build Cloudflare **Failed** | Buka log build. Penyebab tersering: `package.json` tidak di halaman utama repository (Tahap 5.2), atau `NODE_VERSION` belum diisi `20` |
| Build sukses tapi halaman **kosong putih** | Build output directory harus `dist`. Cek di **Settings → Builds** |
| **404 saat refresh** halaman | File `public/_redirects` belum terunggah. Unggah ke folder `public` di GitHub |
| "Akun belum dikonfirmasi" saat daftar | **Confirm email** masih aktif. Matikan (Tahap 2) |
| `email_address_invalid` / domain ditolak | `VITE_AUTH_EMAIL_DOMAIN` memakai domain palsu. Ganti dengan subdomain domain asli atau `.pages.dev` (hanya jika belum ada warga mendaftar) |
| Pendaftar tidak muncul di Verifikasi | `01-skema.sql` belum sukses penuh. Jalankan ulang di SQL Editor |
| `jadikan_admin` → "tidak ditemukan" | Nomor HP berbeda dengan yang didaftarkan, atau Anda belum menekan Daftar |
| "Anda tidak memiliki akses" | Peran belum sesuai atau akun belum disetujui |
| Foto tidak tampil / unggah gagal | Bucket Storage belum ada. Jalankan ulang `01-skema.sql` |
| Login berhasil lalu terlempar keluar | Site URL / Redirect URLs belum diisi alamat situs (Tahap 7) |
| Aplikasi tiba-tiba error semua | Supabase Free **ter-pause** setelah ±1 minggu tanpa aktivitas. Buka dashboard Supabase → **Restore project** |
| Warga lupa kata sandi | Admin: **Data Warga → Ubah → Atur Ulang Kata Sandi** |

---

## Batas paket gratis

Angka bisa berubah. Periksa halaman harga resmi masing-masing layanan.

| Layanan | Batas utama |
|---|---|
| **Supabase Free** | Database 500 MB, Storage 1 GB, transfer 5 GB/bulan, 50.000 pengguna aktif/bulan, **pause** bila tidak dipakai ±1 minggu, **tanpa backup otomatis** yang bisa dipulihkan sendiri |
| **Cloudflare Pages Free** | 500 build/bulan, bandwidth tanpa batas |
| **GitHub Free** | Repository privat tak terbatas |
| **Berbayar** | Hanya registrasi domain (opsional) |

> 💾 **Wajib rutin (mis. tiap awal bulan):** ekspor data penting dari Supabase **Table Editor** → pilih tabel → **Export → CSV**. Simpan di Google Drive pengurus.

---

## Lampiran: Prompt untuk melanjutkan dengan Claude

### Cara paling mudah (tanpa unggah zip berulang)

1. Di Claude, sambungkan repository GitHub `paguyuban-warga` ke sesi. Saat Claude meminta akses ke repository, tekan **Izinkan/Allow**.
2. Tempel **Prompt Utama** di bawah dan isi bagian `[...]`.
3. Claude akan mengubah kode dan mengunggahnya ke GitHub. Cloudflare membangun ulang otomatis.

Bila belum tersambung ke GitHub, lampirkan `paguyuban-warga.zip` di chat sebagai gantinya.

### Prompt Utama (salin semua)

```
Bertindaklah sebagai Senior Full-Stack Developer dan UI/UX Designer.

Saya melanjutkan proyek "Paguyuban Warga Digital". Kodenya ada di repository GitHub [pemilik/paguyuban-warga] (atau zip terlampir). Mulai dengan membaca README.md dan PANDUAN-INSTALASI-ONLINE.md, lalu jelajahi src/ dan supabase/ sebelum mengubah apa pun.

CARA KERJA SAYA: SEMUA ONLINE
- Saya TIDAK memakai laptop untuk menjalankan kode (tanpa Node.js, npm, atau git lokal).
- Perubahan kode dikirim langsung ke GitHub (branch main), lalu Cloudflare Pages membangun otomatis.
- Perubahan database saya jalankan sendiri lewat Supabase SQL Editor.
- Jadi: jangan beri instruksi yang butuh terminal di laptop saya. Beri langkah lewat browser.

KONTEKS PROYEK
- Aplikasi untuk SATU paguyuban warga (satu lingkungan/RT), bahasa Indonesia.
- Stack: React 18 + Vite 6, react-router-dom 6, lucide-react, @fontsource/poppins, @supabase/supabase-js (PKCE). Backend: Supabase Free (Auth, PostgreSQL + RLS, Storage, Realtime). Hosting: Cloudflare Pages Free. Target biaya hosting Rp0.
- Desain: header hijau, bottom navigation di HP, sidebar di tablet/desktop. Jangan ganti dengan template generik.
- Responsif HP (<768px), tablet (768-1099px), desktop (>=1100px).

KEPUTUSAN FINAL (jangan ditanyakan ulang)
1. Login nomor HP + kata sandi; nomor HP disimpan sebagai email internal 62xxxx@VITE_AUTH_EMAIL_DOMAIN (Confirm email OFF). Login Google opsional lewat VITE_GOOGLE_LOGIN.
2. Pendaftaran disetujui admin/pengurus, TANPA OTP/SMS.
3. Lupa sandi: admin reset via RPC reset_sandi_warga; warga ubah sendiri via RPC ubah_sandi.
4. Peran: warga, pengurus, bendahara, admin. Admin pertama lewat SQL: select public.jadikan_admin('0812...'); tidak boleh bisa dipanggil dari aplikasi.
5. JANGAN PERNAH menaruh service_role/secret key di frontend. Hak akses ditegakkan lewat RLS dan fungsi SECURITY DEFINER dengan search_path dikunci. Validasi di formulir DAN di database.
6. Foto dikompres di klien; bucket bukti & konten privat (signed URL 1 jam); bucket publik untuk aset umum.
7. Hindari layanan berbayar.
8. Struktur: src/services, src/features, src/components/ui|layout, src/context, src/hooks, src/lib, src/styles. Modul baru: SQL + RLS → services/<modul>.js → features/<modul>/ → rute di App.jsx.
9. Perubahan skema ditulis sebagai file baru supabase/03-....sql dst. (idempotent). Jangan mengedit 01-skema.sql.

ATURAN KERJA
- Jawab dan tulis teks antarmuka dalam bahasa Indonesia.
- Jelaskan singkat apa yang akan diubah sebelum mengubah. Pastikan build lulus (npm run build) di lingkungan Anda sebelum mengirim ke GitHub.
- Bila ada SQL baru, sebutkan nama filenya dan langkah menjalankannya di Supabase SQL Editor.
- Bila ada yang tidak bisa Anda uji (butuh Supabase/Cloudflare saya), katakan terus terang dan beri langkah uji lewat browser.

YANG SAYA INGINKAN SEKARANG
[tulis di sini, mis.:]
- Pandu saya Tahap [..] dari PANDUAN-INSTALASI-ONLINE.md, saya akan melapor di setiap titik periksa.
- Saya mendapat galat ini di Tahap [..]: [pesan galat / screenshot].
- Tambahkan fitur: [nama fitur dan perilakunya].
- Sesuaikan data awal: nama [..], RT/RW [..], blok [..], tarif IPL [..], rekening [..].
```

### Prompt saat melapor galat

```
Proyek: Paguyuban Warga Digital (semua online: GitHub + Cloudflare Pages + Supabase, tanpa laptop).
Tahap: [mis. Tahap 6 Cloudflare / Tahap 8 admin pertama].
Yang saya lakukan: [langkah terakhir].
Yang terjadi: [pesan galat persis / screenshot / potongan log build Cloudflare].
Yang saya harapkan: [hasil seharusnya].
Browser / perangkat: [..].
Tolong cari penyebabnya, beri perbaikan paling kecil yang bisa saya lakukan lewat browser, dan cara memastikannya sudah beres.
```

### Catatan keamanan

- Jangan tempel **service_role key**, **Database password**, atau **Google Client Secret** ke chat mana pun. Project URL dan anon/publishable key boleh, karena memang publik.
- Batasi akses aplikasi GitHub (Cloudflare maupun Claude) hanya ke repository `paguyuban-warga` (**Only select repositories**).
- Akun Supabase, GitHub, dan Cloudflare tidak terikat ke akun Claude. Pindah akun Claude tidak mengubah apa pun di sana.
