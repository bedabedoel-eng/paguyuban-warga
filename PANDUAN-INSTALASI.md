# Panduan Instalasi Lengkap: Paguyuban Warga Digital

Panduan ini membawa Anda dari nol sampai aplikasi online di domain sendiri, dengan biaya hosting Rp0 (domain tetap berbayar). Ikuti berurutan. Setiap tahap punya **titik periksa** agar Anda tahu langkah itu berhasil sebelum lanjut.

Bagian A adalah instalasi. Bagian B adalah **prompt** untuk melanjutkan proyek ini di akun Claude lain.

---

## BAGIAN A: INSTALASI

### Gambaran alur

```
Siapkan akun & alat  →  Supabase (database)  →  Jalankan lokal  →  Admin pertama
        →  GitHub  →  Cloudflare Pages  →  Domain  →  Uji akhir
```

Estimasi waktu: 45 sampai 90 menit untuk pemula.

### Tahap 0. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Komputer (Windows/Mac/Linux) | Untuk menjalankan dan mengunggah kode |
| **Node.js 20 atau lebih baru** | Unduh versi LTS di <https://nodejs.org>. Cek: `node -v` |
| **Git** | <https://git-scm.com/downloads>. Cek: `git --version` |
| Editor kode | Disarankan VS Code |
| Akun **Supabase**, **GitHub**, **Cloudflare** | Semua gratis. Aktifkan 2FA di ketiganya |
| Domain sendiri (opsional di awal) | Bisa memakai `*.pages.dev` dulu, domain menyusul |

Ekstrak `paguyuban-warga.zip` ke satu folder, mis. `C:\proyek\paguyuban-warga` atau `~/proyek/paguyuban-warga`. Semua perintah di bawah dijalankan dari dalam folder itu.

**Titik periksa:** `node -v` menampilkan v20 atau lebih tinggi, dan `git --version` menampilkan versi.

---

### Tahap 1. Buat proyek Supabase

1. Buka <https://supabase.com>, daftar atau masuk, lalu klik **New project**.
2. Isi nama proyek, buat **Database password** (simpan di pengelola kata sandi), pilih region **Southeast Asia (Singapore)**, paket **Free**.
3. Tunggu sampai status proyek siap (1 sampai 2 menit).

### Tahap 2. Atur autentikasi Supabase

Aplikasi memakai email internal `62812xxxx@domain-akun` hanya sebagai penampung nomor HP. Tidak ada email yang dikirim.

1. **Authentication > Sign In / Providers > Email**
   - *Enable Email provider*: **aktif**
   - *Confirm email*: **MATIKAN** (wajib, kalau tidak pendaftaran gagal)
   - *Minimum password length*: **8**
2. **Authentication > URL Configuration**
   - *Site URL*: isi sementara `http://localhost:5173`
   - *Redirect URLs*: tambahkan `http://localhost:5173/**`

(Nanti setelah domain siap, tambahkan alamat produksi. Lihat Tahap 8.)

### Tahap 3. Jalankan SQL

Buka **SQL Editor > New query**.

1. Salin seluruh isi `supabase/01-skema.sql`, tempel, klik **Run**. Harus selesai tanpa galat merah. Aman dijalankan ulang.
2. Buka `supabase/02-data-awal.sql` di editor. **Sesuaikan**:
   - nama paguyuban, RT/RW, alamat
   - tarif IPL dan rekening
   - daftar blok
   - kontak darurat

   Lalu tempel dan **Run**. Semua ini bisa diubah lagi dari menu Admin nanti.

**Titik periksa:** di **Table Editor** terlihat tabel `warga`, `rumah`, `tagihan_ipl`, `pengumuman`, dan lainnya. Di **Storage** terlihat bucket `publik`, `konten`, `bukti`.

### Tahap 4. Ambil kunci

**Project Settings > API Keys** (atau *Data API*). Catat dua nilai:

- **Project URL**, bentuknya `https://xxxx.supabase.co`
- **anon public key** (atau *Publishable key*)

> **Jangan pernah** memakai atau menyalin `service_role` atau *secret key* ke aplikasi ini. Aplikasi tidak membutuhkannya. Kunci anon aman di frontend karena data dilindungi RLS.

---

### Tahap 5. Jalankan di komputer sendiri

```bash
cd paguyuban-warga
npm install
cp .env.example .env.local        # Windows (cmd): copy .env.example .env.local
```

Buka `.env.local` dan isi:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<kunci anon/publishable>
VITE_AUTH_EMAIL_DOMAIN=akun.domainanda.id
VITE_GOOGLE_LOGIN=false
```

Catatan `VITE_AUTH_EMAIL_DOMAIN`: pakai subdomain dari domain asli milik Anda (mis. `akun.paguyubananda.id`). Domain palsu seperti `.local` ditolak Supabase. **Jangan diubah lagi setelah ada warga mendaftar**, karena nomor HP warga tersimpan dalam bentuk email dengan domain ini.

Jalankan:

```bash
npm run dev
```

Buka <http://localhost:5173>.

**Titik periksa:** halaman Masuk tampil. Bila muncul "Aplikasi belum dikonfigurasi", berarti `.env.local` belum benar atau server belum dijalankan ulang setelah mengisinya.

### Tahap 6. Buat admin pertama

1. Di aplikasi klik **Daftar**, isi data Anda sendiri. Layar "Menunggu Persetujuan" muncul.
2. Di Supabase **SQL Editor**, jalankan (ganti dengan nomor HP yang Anda daftarkan):
   ```sql
   select public.jadikan_admin('081234567890');
   ```
   Hasil: `Berhasil: akun sekarang Admin aktif.`
3. Kembali ke aplikasi, tekan **Periksa status** atau muat ulang. Menu **Panel Admin** muncul.

**Titik periksa:** Anda melihat Beranda dan menu Panel Admin. Pendaftar baru berikutnya muncul di **Admin > Verifikasi Anggota**.

### Tahap 7. Unggah ke GitHub

1. Di <https://github.com/new> buat repository kosong, mis. `paguyuban-warga`, pilih **Private**. Jangan centang README/.gitignore.
2. Dari folder proyek:

```bash
git init
git add .
git commit -m "Paguyuban Warga Digital"
git branch -M main
git remote add origin https://github.com/<akun-anda>/paguyuban-warga.git
git push -u origin main
```

`.gitignore` sudah mengecualikan `.env.local` dan `node_modules`. Jangan pernah meng-commit file `.env*` berisi kunci.

**Titik periksa:** file terlihat di GitHub, dan `.env.local` **tidak** ada di sana.

### Tahap 8. Deploy ke Cloudflare Pages

1. <https://dash.cloudflare.com> > **Workers & Pages > Create > Pages > Connect to Git**, pilih repository tadi.
2. Pengaturan build:

| Kolom | Isi |
|---|---|
| Framework preset | Vite (atau None) |
| Build command | `npm run build` |
| Build output directory | `dist` |

3. **Environment variables** (Production **dan** Preview):

| Nama | Nilai |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | kunci anon/publishable |
| `VITE_AUTH_EMAIL_DOMAIN` | sama persis dengan di `.env.local` |
| `VITE_GOOGLE_LOGIN` | `false` (atau `true` bila Google aktif) |
| `NODE_VERSION` | `20` |

4. **Save and Deploy**. Tunggu hingga selesai. Anda mendapat alamat `https://<proyek>.pages.dev`.
5. Kembali ke Supabase > **Authentication > URL Configuration**:
   - *Site URL*: ubah ke alamat produksi
   - *Redirect URLs*: tambahkan `https://<proyek>.pages.dev/**`

Setiap `git push` ke `main` membangun ulang otomatis. Bila Anda mengubah variabel di Cloudflare, jalankan **Retry deployment**, karena nilainya dipasang saat build.

**Titik periksa:** alamat `.pages.dev` terbuka, Anda bisa masuk dengan akun admin, dan refresh di halaman `/ipl` tidak menghasilkan 404.

### Tahap 9. Sambungkan domain sendiri

1. Project Pages > **Custom domains > Set up a custom domain**, masukkan mis. `warga.domainanda.id`.
2. DNS:
   - Domain di Cloudflare DNS: rekam CNAME dibuat otomatis.
   - Domain di penyedia lain: tambahkan `CNAME  warga  →  <proyek>.pages.dev`.
3. Tunggu status *Active* (beberapa menit sampai beberapa jam). HTTPS aktif otomatis.
4. Di Supabase > **Authentication > URL Configuration**: ubah *Site URL* ke `https://warga.domainanda.id` dan tambahkan `https://warga.domainanda.id/**` pada *Redirect URLs*.

### Tahap 10. Login Google (opsional)

1. <https://console.cloud.google.com> > buat project > **APIs & Services > OAuth consent screen** (External, isi nama aplikasi dan email) > **Credentials > Create credentials > OAuth client ID** > *Web application*.
2. **Authorized redirect URI**: salin dari Supabase **Authentication > Providers > Google** (`https://xxxx.supabase.co/auth/v1/callback`).
3. Salin *Client ID* dan *Client Secret* ke form Google di Supabase, aktifkan, simpan. Secret hanya diisi di dashboard Supabase, bukan di aplikasi.
4. Ubah `VITE_GOOGLE_LOGIN=true` (lokal dan Cloudflare), lalu deploy ulang.

Pendaftar Google tetap diminta melengkapi nomor HP, blok, dan nomor rumah, lalu menunggu persetujuan.

### Tahap 11. Uji akhir (wajib)

Pengujian otomatis saat pengembangan memakai stub untuk Supabase Storage dan Realtime. Karena itu uji hal-hal ini di proyek Supabase Anda sendiri:

1. Daftar dengan HP lain → muncul di **Verifikasi Anggota** → **Setujui** → warga bisa masuk.
2. Bendahara/Admin: **Kelola IPL > Tagihan per Periode > Terbitkan Tagihan**.
3. Warga: **IPL > Bayar Sekarang** > unggah foto bukti > **Kirim**. Bendahara: **Terima**, lalu cek menu **Keuangan** (kas bertambah otomatis).
4. Buka `/admin` dengan akun warga biasa → harus dialihkan ke beranda.
5. **Pengaturan > Keamanan**: ubah kata sandi, keluar, masuk dengan kata sandi baru.
6. **Ubah Profil**: unggah foto profil, pastikan tampil.
7. Buat pengumuman dari admin → akun warga menerima notifikasi. Bila tidak realtime, cek **Database > Replication**: tabel `notifikasi` harus ada di publikasi `supabase_realtime`.

### Pemecahan masalah cepat

| Gejala | Solusi |
|---|---|
| "Aplikasi belum dikonfigurasi" | Variabel `VITE_*` belum diisi. Di Cloudflare: isi lalu **Retry deployment** |
| "Akun belum dikonfirmasi" saat daftar | Matikan **Confirm email** (Tahap 2) |
| `email_address_invalid` / domain ditolak | Ganti `VITE_AUTH_EMAIL_DOMAIN` dengan subdomain dari domain asli |
| Pendaftar tidak muncul di Verifikasi | `01-skema.sql` belum sukses penuh (trigger `on_auth_user_created`). Jalankan ulang |
| "Anda tidak memiliki akses" | Peran belum sesuai atau akun belum aktif |
| Gambar tidak tampil / unggah gagal | Cek bucket dan kebijakan Storage; jalankan ulang `01-skema.sql` |
| 404 saat refresh halaman | Pastikan `public/_redirects` ikut ter-deploy |
| Supabase ter-pause | Free plan pause setelah ±1 minggu tanpa aktivitas. Tekan **Restore** di dashboard |
| Lupa kata sandi warga | Admin: **Data Warga > Ubah > Atur Ulang Kata Sandi** |

### Batas gratis (periksa halaman harga resmi, bisa berubah)

- Supabase Free: database 500 MB, Storage 1 GB, transfer 5 GB/bulan, 50.000 pengguna aktif/bulan, pause bila tidak aktif, tanpa backup yang bisa dipulihkan sendiri. **Ekspor data rutin** (Table Editor > Export CSV).
- Cloudflare Pages Free: 500 build/bulan, bandwidth statis tanpa batas.
- GitHub Free: repository privat tak terbatas.
- Biaya yang tidak gratis: **registrasi domain**.

---

## BAGIAN B: PROMPT UNTUK MELANJUTKAN DI AKUN LAIN

### Cara memakai

1. Unduh dan simpan `paguyuban-warga.zip` (sudah berisi file panduan ini dan `README.md`).
2. Di akun baru, mulai chat baru dan **lampirkan zip** itu.
3. Tempel **Prompt Utama** di bawah. Ganti bagian `[...]` dengan kebutuhan Anda.
4. Bila proyek sudah ada di GitHub, Anda juga bisa menyambungkan repository itu ke sesi baru, lalu tulis nama repository di prompt.

### Prompt Utama (salin semua)

```
Bertindaklah sebagai Senior Full-Stack Developer dan UI/UX Designer.

Saya melanjutkan proyek "Paguyuban Warga Digital" yang dibuat di sesi sebelumnya (di akun lain). Seluruh kodenya ada di file zip terlampir. Mulai dengan membaca README.md dan PANDUAN-INSTALASI.md di dalamnya, lalu jelajahi struktur src/ dan supabase/ sebelum mengubah apa pun.

KONTEKS PROYEK
- Aplikasi untuk SATU paguyuban warga (satu lingkungan/RT), bahasa Indonesia.
- Stack: React 18 + Vite 6, react-router-dom 6, lucide-react, @fontsource/poppins, @supabase/supabase-js (PKCE). Backend: Supabase Free (Auth, PostgreSQL + RLS, Storage, Realtime). Hosting: Cloudflare Pages Free dengan domain sendiri. Kode di GitHub. Target biaya hosting Rp0.
- Desain mengikuti gambar referensi (20 layar mobile + dashboard desktop + login admin desktop): header hijau, bottom navigation di HP, sidebar di tablet/desktop. JANGAN mengganti dengan template generik. Bila saya melampirkan gambar referensi lagi, itu acuan utama tampilan.
- Responsif HP (<768px), tablet (768-1099px), desktop (>=1100px).

KEPUTUSAN YANG SUDAH FINAL (jangan ditanyakan ulang)
1. Login memakai nomor HP + kata sandi. Nomor HP disimpan sebagai email internal 62xxxx@VITE_AUTH_EMAIL_DOMAIN (Confirm email di Supabase harus OFF). Tombol "Masuk dengan Google" boleh, opsional lewat VITE_GOOGLE_LOGIN.
2. Pendaftaran cukup persetujuan admin/pengurus, TANPA OTP/SMS (karena berbayar).
3. Lupa sandi: admin reset lewat RPC reset_sandi_warga; warga ubah sendiri lewat RPC ubah_sandi.
4. Peran: warga, pengurus, bendahara (pengurus berjabatan mengandung "bendahara" atau "ketua", atau admin), admin. Admin pertama dibuat lewat SQL: select public.jadikan_admin('0812...'); fungsi ini tidak boleh bisa dipanggil dari aplikasi.
5. Keamanan: JANGAN PERNAH menaruh secret key atau service_role key di frontend. Hanya anon/publishable key. Semua hak akses ditegakkan di database lewat RLS dan fungsi SECURITY DEFINER dengan search_path dikunci, bukan hanya di UI. Validasi di formulir DAN di database.
6. Foto dikompres di klien sebelum upload; bucket bukti & konten privat (signed URL 1 jam); bucket publik untuk aset umum.
7. Hindari layanan berbayar; jelaskan batas paket gratis bila relevan.
8. Struktur kode modular: src/services (akses data per domain), src/features (satu folder per modul), src/components/ui|layout, src/context, src/hooks, src/lib, src/styles. Tambah modul dengan pola: SQL + RLS → services/<modul>.js → features/<modul>/ → rute di App.jsx.

STATUS TERAKHIR
- Aplikasi lengkap dan sudah diuji: 67 pemeriksaan RLS/aturan bisnis, 60 pemeriksaan rute (desktop + HP), 21 pemeriksaan alur browser; semuanya lulus.
- Batasan pengujian: Supabase Storage dan Realtime hanya diuji dengan stub, dan aplikasi BELUM pernah dicoba di proyek Supabase asli saya. Anggap unggah foto, ubah sandi, dan notifikasi realtime sebagai area berisiko; bantu saya mengujinya dan perbaiki bila ada masalah.
- Berkas SQL: supabase/01-skema.sql (idempotent) dan supabase/02-data-awal.sql (data awal yang perlu disesuaikan).
- Perubahan skema berikutnya ditulis sebagai berkas baru (supabase/03-....sql, dst.) yang idempotent, jangan mengedit 01-skema.sql yang sudah terpasang di database.

ATURAN KERJA
- Jawab dan tulis teks antarmuka dalam bahasa Indonesia.
- Sebelum mengubah kode, jelaskan singkat apa yang akan diubah. Setelah mengubah, jalankan npm run build untuk memastikan tidak error.
- Pertahankan gaya desain, token warna (src/styles/tokens.css), dan pola kode yang sudah ada.
- Bila ada perubahan skema, berikan SQL-nya terpisah dan jelaskan cara menjalankannya di Supabase SQL Editor.
- Bila ada hal yang tidak bisa Anda uji (butuh proyek Supabase/Cloudflare saya), katakan terus terang dan beri langkah uji manual.

YANG SAYA INGINKAN SEKARANG
[PILIH SALAH SATU / TULIS SENDIRI, contoh:]
- Pandu saya setup Supabase, GitHub, dan Cloudflare Pages langkah demi langkah, saya akan melapor di setiap titik periksa.
- Saya mendapat galat ini saat [langkah]: [tempel pesan galat / screenshot]. Bantu diagnosis dan perbaiki.
- Tambahkan fitur: [nama fitur dan perilaku yang diinginkan].
- Ubah tampilan layar [nama layar] agar lebih mirip gambar referensi terlampir.
- Sesuaikan data awal untuk paguyuban saya: nama [..], RT/RW [..], blok [..], tarif IPL [..], rekening [..].
```

### Prompt singkat (bila kode sudah di GitHub dan repository tersambung)

```
Lanjutkan proyek Paguyuban Warga Digital di repository [pemilik/nama-repo]. Baca README.md dan PANDUAN-INSTALASI.md dulu. Stack: React + Vite, Supabase Free (Auth, PostgreSQL + RLS, Storage), Cloudflare Pages. Login nomor HP + kata sandi, pendaftaran disetujui admin tanpa OTP, satu paguyuban. Jangan pernah menaruh service_role key di frontend, hak akses ditegakkan lewat RLS. Perubahan skema ditulis sebagai berkas SQL baru yang idempotent. Tugas saya: [tulis di sini].
```

### Prompt saat melapor galat (praktis untuk dipakai berulang)

```
Konteks: proyek Paguyuban Warga Digital (lihat README.md).
Tahap yang sedang saya kerjakan: [mis. Tahap 5 menjalankan lokal / Tahap 8 deploy Cloudflare].
Yang saya lakukan: [langkah terakhir].
Yang terjadi: [pesan galat persis atau deskripsi + screenshot].
Yang saya harapkan: [hasil yang seharusnya].
Sistem operasi / browser: [..].
Tolong cari penyebabnya, beri perbaikan paling kecil, dan jelaskan cara memastikannya sudah beres.
```

### Catatan keamanan saat berpindah akun

- Jangan menempelkan `service_role` key, password database, atau Client Secret Google ke chat. Kunci anon dan Project URL boleh karena memang publik.
- Jangan menyertakan `.env.local` ke dalam zip yang Anda unggah. Zip dari sesi ini sudah tidak memuatnya.
- Akun Supabase, GitHub, dan Cloudflare tidak terikat ke akun Claude. Anda tetap memakai akun yang sama di sana, jadi tidak perlu membuat ulang apa pun.
