-- =====================================================================
-- SKEMA LENGKAP TERKINI (instalasi baru) - DIHASILKAN OTOMATIS, JANGAN DIUBAH TANGAN.
-- Gabungan berurutan: 01-skema.sql 02-data-awal.sql 03-pin-angka.sql 04-import-warga.sql 05-struktur-pengurus.sql 06-nama-perumahan.sql 07-update-sensus-blok-ipl.sql 08-perbaikan-prioritas.sql 09-fitur-bendahara.sql 10-polling-dan-rekap-alamat.sql 11-nomor-jalan.sql 12-status-hunian.sql 13-pin-awal-acak.sql 14-batas-percobaan-login.sql 15-import-hunian.sql 16-status-tagihan-otomatis.sql 17-batasi-bucket-publik.sql 18-nama-paguyuban-vgr.sql 19-nonaktifkan-batas-login.sql 20-perbaikan-warga-massal.sql
-- Dibuat oleh supabase/buat-skema-lengkap.sh. Untuk mengubah skema, buat migrasi bernomor baru lalu jalankan ulang skrip itu.
--
-- PEMAKAIAN:
--  * Proyek Supabase BARU/KOSONG: jalankan berkas ini SEKALI di SQL Editor (satu berkas, tanpa migrasi lain).
--  * Proyek yang SUDAH BERJALAN: JANGAN pakai berkas ini; jalankan hanya migrasi bernomor yang belum pernah
--    dijalankan, berurutan (lihat DAFTAR-MIGRASI.md dan cek-migrasi.sql).
-- Berkas ini memuat data awal contoh dari 02-data-awal.sql; sesuaikan di aplikasi sesudahnya.
-- =====================================================================

-- #####################################################################
-- ##  BERKAS: 01-skema.sql
-- #####################################################################
-- =====================================================================
-- PAGUYUBAN WARGA DIGITAL — Skema database Supabase
-- Jalankan SEKALI di Supabase > SQL Editor > New query > tempel > Run.
-- Berisi: tabel, indeks, fungsi, trigger, Row Level Security (RLS),
-- bucket penyimpanan, dan kebijakan penyimpanan.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------

-- Pengaturan paguyuban (hanya satu baris)
create table if not exists public.pengaturan (
  id smallint primary key default 1 check (id = 1),
  nama_paguyuban text not null default 'Paguyuban Warga Digital' check (char_length(nama_paguyuban) between 3 and 80),
  tagline text not null default 'Bersama Membangun Lingkungan yang Lebih Baik' check (char_length(tagline) <= 120),
  nama_lingkungan text not null default 'Perumahan Vila Gading Royal' check (char_length(nama_lingkungan) <= 80),
  rt text not null default '01' check (char_length(rt) <= 5),
  rw text not null default '05' check (char_length(rw) <= 5),
  alamat text not null default 'Desa Pamegarsari, Kec. Parung, Kab. Bogor' check (char_length(alamat) <= 200),
  luas_wilayah text not null default '' check (char_length(luas_wilayah) <= 20),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  tarif_ipl integer not null default 70000 check (tarif_ipl between 0 and 100000000),
  jatuh_tempo_hari smallint not null default 10 check (jatuh_tempo_hari between 1 and 28),
  bank_nama text not null default '' check (char_length(bank_nama) <= 40),
  bank_norek text not null default '' check (char_length(bank_norek) <= 40),
  bank_atas_nama text not null default '' check (char_length(bank_atas_nama) <= 80),
  foto_lingkungan text check (char_length(foto_lingkungan) <= 300),
  updated_at timestamptz not null default now()
);
insert into public.pengaturan (id) values (1) on conflict (id) do nothing;

-- Daftar blok
create table if not exists public.blok (
  kode text primary key check (kode ~ '^[A-Z0-9]{1,5}$'),
  nama text not null check (char_length(nama) between 1 and 40),
  urutan integer not null default 0
);

-- Rumah / kavling (dasar tagihan IPL per KK)
create table if not exists public.rumah (
  id uuid primary key default gen_random_uuid(),
  blok text not null references public.blok(kode) on update cascade,
  nomor text not null check (nomor ~ '^[0-9A-Za-z-]{1,6}$'),
  kode text generated always as (blok || '-' || nomor) stored,
  status text not null default 'dihuni' check (status in ('dihuni', 'kosong')),
  tarif_ipl integer check (tarif_ipl between 0 and 100000000),
  catatan text check (char_length(catatan) <= 200),
  created_at timestamptz not null default now(),
  unique (blok, nomor)
);

-- Profil warga (data yang boleh dilihat sesama anggota aktif)
create table if not exists public.warga (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null check (char_length(nama) between 2 and 80),
  blok text references public.blok(kode) on update cascade on delete set null,
  no_rumah text check (no_rumah ~ '^[0-9A-Za-z-]{1,6}$'),
  rumah_id uuid references public.rumah(id) on delete set null,
  kepala_keluarga boolean not null default false,
  pekerjaan text check (char_length(pekerjaan) <= 60),
  hobi text check (char_length(hobi) <= 120),
  tentang text check (char_length(tentang) <= 500),
  keluarga text check (char_length(keluarga) <= 120),
  foto_path text check (char_length(foto_path) <= 300),
  role text not null default 'warga' check (role in ('warga', 'pengurus', 'admin')),
  status text not null default 'menunggu' check (status in ('menunggu', 'aktif', 'ditolak', 'nonaktif')),
  alasan_status text check (char_length(alasan_status) <= 300),
  bergabung_at timestamptz,
  disetujui_oleh uuid references public.warga(id) on delete set null,
  pref_notifikasi jsonb not null default '{"ipl": true, "pengumuman": true, "kegiatan": true, "laporan": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists warga_status_idx on public.warga (status);
create index if not exists warga_rumah_idx on public.warga (rumah_id);

-- Kontak warga (data pribadi: hanya pemilik dan pengurus)
create table if not exists public.warga_kontak (
  warga_id uuid primary key references public.warga(id) on delete cascade,
  nomor_hp text unique check (nomor_hp ~ '^62[0-9]{8,13}$'),
  email text check (char_length(email) <= 120),
  tampilkan_hp boolean not null default true,
  tampilkan_email boolean not null default false
);

-- Pengurus paguyuban
create table if not exists public.pengurus (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga(id) on delete cascade,
  jabatan text not null check (char_length(jabatan) between 2 and 60),
  inti boolean not null default false,
  urutan integer not null default 100,
  periode_mulai smallint check (periode_mulai between 2000 and 2100),
  periode_selesai smallint check (periode_selesai between 2000 and 2100),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  check (periode_selesai is null or periode_mulai is null or periode_selesai >= periode_mulai)
);
create index if not exists pengurus_warga_idx on public.pengurus (warga_id);

-- Tagihan IPL per rumah per bulan
create table if not exists public.pembayaran_ipl (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga(id) on delete cascade,
  rumah_id uuid not null references public.rumah(id) on delete cascade,
  jumlah integer not null check (jumlah > 0),
  bukti_path text not null check (char_length(bukti_path) <= 300),
  catatan text check (char_length(catatan) <= 300),
  status text not null default 'menunggu' check (status in ('menunggu', 'diterima', 'ditolak')),
  alasan_tolak text check (char_length(alasan_tolak) <= 300),
  diverifikasi_oleh uuid references public.warga(id) on delete set null,
  diverifikasi_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pembayaran_status_idx on public.pembayaran_ipl (status, created_at desc);

create table if not exists public.tagihan_ipl (
  id uuid primary key default gen_random_uuid(),
  rumah_id uuid not null references public.rumah(id) on delete cascade,
  periode date not null check (extract(day from periode) = 1),
  nominal integer not null check (nominal between 0 and 100000000),
  status text not null default 'belum_bayar' check (status in ('belum_bayar', 'menunggu_verifikasi', 'lunas')),
  jatuh_tempo date,
  pembayaran_id uuid references public.pembayaran_ipl(id) on delete set null,
  dibayar_at timestamptz,
  metode text check (metode in ('transfer', 'tunai')),
  created_at timestamptz not null default now(),
  unique (rumah_id, periode)
);
create index if not exists tagihan_periode_idx on public.tagihan_ipl (periode, status);

-- Kas paguyuban
create table if not exists public.transaksi_kas (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('pemasukan', 'pengeluaran')),
  kategori text not null check (char_length(kategori) between 2 and 40),
  jumlah bigint not null check (jumlah > 0 and jumlah < 100000000000),
  tanggal date not null default current_date,
  keterangan text check (char_length(keterangan) <= 300),
  bukti_path text check (char_length(bukti_path) <= 300),
  sumber text not null default 'manual' check (sumber in ('manual', 'ipl')),
  pembayaran_id uuid references public.pembayaran_ipl(id) on delete set null,
  tagihan_id uuid unique references public.tagihan_ipl(id) on delete set null,
  dibuat_oleh uuid references public.warga(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists kas_tanggal_idx on public.transaksi_kas (tanggal desc);

-- Pengumuman
create table if not exists public.pengumuman (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (char_length(judul) between 3 and 120),
  ringkasan text check (char_length(ringkasan) <= 160),
  isi text not null check (char_length(isi) between 3 and 5000),
  kategori text not null default 'umum' check (kategori in ('penting', 'kegiatan', 'info', 'umum')),
  gambar_path text check (char_length(gambar_path) <= 300),
  disematkan boolean not null default false,
  dibuat_oleh uuid references public.warga(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pengumuman_created_idx on public.pengumuman (created_at desc);

-- Kegiatan
create table if not exists public.kegiatan (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (char_length(judul) between 3 and 120),
  deskripsi text check (char_length(deskripsi) <= 3000),
  lokasi text not null check (char_length(lokasi) between 2 and 120),
  mulai timestamptz not null,
  selesai timestamptz not null,
  gambar_path text check (char_length(gambar_path) <= 300),
  perlu_daftar boolean not null default true,
  kuota integer check (kuota > 0),
  dibuat_oleh uuid references public.warga(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (selesai >= mulai)
);
create index if not exists kegiatan_mulai_idx on public.kegiatan (mulai);

create table if not exists public.kegiatan_peserta (
  kegiatan_id uuid not null references public.kegiatan(id) on delete cascade,
  warga_id uuid not null references public.warga(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (kegiatan_id, warga_id)
);

-- Aspirasi & laporan warga
create table if not exists public.laporan (
  id uuid primary key default gen_random_uuid(),
  kategori text not null check (kategori in ('lampu_jalan', 'sampah', 'fasilitas', 'keamanan', 'usulan_kegiatan', 'keluhan')),
  judul text not null check (char_length(judul) between 3 and 120),
  deskripsi text not null check (char_length(deskripsi) between 5 and 3000),
  foto_path text check (char_length(foto_path) <= 300),
  status text not null default 'baru' check (status in ('baru', 'diproses', 'selesai', 'ditolak')),
  tanggapan text check (char_length(tanggapan) <= 1000),
  ditangani_oleh uuid references public.warga(id) on delete set null,
  pelapor_id uuid not null references public.warga(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists laporan_status_idx on public.laporan (status, created_at desc);

-- Notifikasi per warga
create table if not exists public.notifikasi (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid not null references public.warga(id) on delete cascade,
  judul text not null,
  isi text,
  jenis text not null default 'umum' check (jenis in ('ipl', 'pengumuman', 'kegiatan', 'laporan', 'akun', 'umum')),
  tautan text,
  dibaca_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifikasi_warga_idx on public.notifikasi (warga_id, created_at desc);

-- Log aktivitas
create table if not exists public.aktivitas (
  id uuid primary key default gen_random_uuid(),
  pelaku_id uuid references public.warga(id) on delete set null,
  jenis text not null check (jenis in ('ipl', 'aspirasi', 'kegiatan', 'keuangan', 'pengumuman', 'anggota')),
  teks text not null,
  publik boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists aktivitas_created_idx on public.aktivitas (created_at desc);

-- Kontak darurat
create table if not exists public.kontak_darurat (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(nama) between 2 and 60),
  nomor text not null check (nomor ~ '^[0-9+ -]{3,20}$'),
  keterangan text check (char_length(keterangan) <= 120),
  urutan integer not null default 100
);

-- ---------------------------------------------------------------------
-- 2. FUNGSI BANTU HAK AKSES
-- ---------------------------------------------------------------------

create or replace function public.is_aktif() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.warga w where w.id = auth.uid() and w.status = 'aktif')
$$;

create or replace function public.is_pengurus() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.warga w where w.id = auth.uid() and w.status = 'aktif' and w.role in ('pengurus', 'admin'))
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.warga w where w.id = auth.uid() and w.status = 'aktif' and w.role = 'admin')
$$;

-- Bendahara = admin, atau pengurus aktif berjabatan bendahara/ketua
create or replace function public.is_bendahara() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.pengurus p join public.warga w on w.id = p.warga_id
    where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
      and w.role in ('pengurus', 'admin') and p.jabatan ~* '(bendahara|ketua)'
  )
$$;

create or replace function public.rumah_saya() returns uuid
language sql stable security definer set search_path = '' as $$
  select w.rumah_id from public.warga w where w.id = auth.uid() and w.status = 'aktif'
$$;

-- Hak akses ringkas untuk frontend
create or replace function public.hak_saya() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'aktif', public.is_aktif(),
    'pengurus', public.is_pengurus(),
    'admin', public.is_admin(),
    'bendahara', public.is_bendahara()
  )
$$;

-- Normalisasi nomor HP ke format 62xxxxxxxx
create or replace function public.normalisasi_hp(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if d like '0%' then d := '62' || substr(d, 2);
  elsif d like '8%' then d := '62' || d;
  end if;
  if d ~ '^62[0-9]{8,13}$' then return d; end if;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 3. FUNGSI INTERNAL (notifikasi & aktivitas)
-- ---------------------------------------------------------------------

create or replace function public._notif(p_warga uuid[], p_judul text, p_isi text, p_jenis text, p_tautan text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifikasi (warga_id, judul, isi, jenis, tautan)
  select w.id, left(p_judul, 160), left(p_isi, 300), p_jenis, p_tautan
  from public.warga w
  where w.id = any (p_warga)
    and w.status = 'aktif'
    and coalesce((w.pref_notifikasi ->> p_jenis)::boolean, true);
end $$;

create or replace function public._notif_pengurus(p_judul text, p_isi text, p_jenis text, p_tautan text, p_hanya_bendahara boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(w.id) into ids from public.warga w
  where w.status = 'aktif' and w.role in ('pengurus', 'admin')
    and (not p_hanya_bendahara or w.role = 'admin' or exists (
      select 1 from public.pengurus p where p.warga_id = w.id and p.aktif and p.jabatan ~* '(bendahara|ketua)'));
  if ids is not null then
    insert into public.notifikasi (warga_id, judul, isi, jenis, tautan)
    select unnest(ids), left(p_judul, 160), left(p_isi, 300), p_jenis, p_tautan;
  end if;
end $$;

create or replace function public._aktivitas(p_pelaku uuid, p_jenis text, p_teks text, p_publik boolean)
returns void language sql security definer set search_path = '' as $$
  insert into public.aktivitas (pelaku_id, jenis, teks, publik) values (p_pelaku, p_jenis, left(p_teks, 300), p_publik);
$$;

create or replace function public._nama_periode(p date) returns text
language sql immutable set search_path = '' as $$
  select (array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[extract(month from p)::int]
         || ' ' || extract(year from p)::int
$$;

-- ---------------------------------------------------------------------
-- 4. TRIGGER
-- ---------------------------------------------------------------------

create or replace function public._set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists warga_updated on public.warga;
create trigger warga_updated before update on public.warga for each row execute function public._set_updated_at();
drop trigger if exists pengumuman_updated on public.pengumuman;
create trigger pengumuman_updated before update on public.pengumuman for each row execute function public._set_updated_at();
drop trigger if exists laporan_updated on public.laporan;
create trigger laporan_updated before update on public.laporan for each row execute function public._set_updated_at();
drop trigger if exists pengaturan_updated on public.pengaturan;
create trigger pengaturan_updated before update on public.pengaturan for each row execute function public._set_updated_at();

-- 4a. Akun baru di auth.users -> baris warga + kontak (status menunggu)
create or replace function public._user_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_nama text;
  v_blok text;
  v_no text;
  v_hp text;
begin
  v_nama := left(btrim(coalesce(m ->> 'nama', m ->> 'full_name', m ->> 'name', '')), 80);
  if char_length(v_nama) < 2 then v_nama := 'Warga Baru'; end if;
  v_blok := upper(btrim(coalesce(m ->> 'blok', '')));
  if not exists (select 1 from public.blok b where b.kode = v_blok) then v_blok := null; end if;
  v_no := nullif(btrim(coalesce(m ->> 'no_rumah', '')), '');
  if v_no !~ '^[0-9A-Za-z-]{1,6}$' then v_no := null; end if;
  v_hp := public.normalisasi_hp(m ->> 'nomor_hp');

  insert into public.warga (id, nama, blok, no_rumah)
  values (new.id, v_nama, v_blok, v_no)
  on conflict (id) do nothing;

  insert into public.warga_kontak (warga_id, nomor_hp, email)
  values (new.id, v_hp, case when v_provider = 'email' then null else new.email end)
  on conflict (warga_id) do nothing;

  perform public._notif_pengurus('Pendaftaran anggota baru', v_nama || ' menunggu verifikasi', 'akun', '/admin/verifikasi');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public._user_baru();

-- 4b. Lindungi kolom sensitif warga & sinkronkan rumah
create or replace function public._warga_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass', true), '') = '1';
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not v_bypass and not public.is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.alasan_status is distinct from old.alasan_status
       or new.rumah_id is distinct from old.rumah_id
       or new.kepala_keluarga is distinct from old.kepala_keluarga
       or new.bergabung_at is distinct from old.bergabung_at
       or new.disetujui_oleh is distinct from old.disetujui_oleh then
      raise exception 'Tidak diizinkan mengubah data ini' using errcode = '42501';
    end if;
    if old.status = 'aktif' and (new.blok is distinct from old.blok or new.no_rumah is distinct from old.no_rumah) then
      raise exception 'Perubahan blok/nomor rumah hanya oleh admin' using errcode = '42501';
    end if;
  end if;

  -- Jangan sampai tidak ada admin aktif
  if tg_op = 'UPDATE' and old.role = 'admin' and old.status = 'aktif'
     and (new.role <> 'admin' or new.status <> 'aktif')
     and not exists (select 1 from public.warga w where w.role = 'admin' and w.status = 'aktif' and w.id <> old.id) then
    raise exception 'Minimal harus ada satu admin aktif' using errcode = '42501';
  end if;

  -- Rumah otomatis untuk warga aktif
  if new.status = 'aktif' and new.blok is not null and new.no_rumah is not null
     and (tg_op = 'INSERT' or new.blok is distinct from old.blok or new.no_rumah is distinct from old.no_rumah
          or new.rumah_id is null or old.status <> 'aktif') then
    insert into public.rumah (blok, nomor) values (new.blok, upper(new.no_rumah))
    on conflict (blok, nomor) do nothing;
    select r.id into new.rumah_id from public.rumah r where r.blok = new.blok and r.nomor = upper(new.no_rumah);
    update public.rumah set status = 'dihuni' where id = new.rumah_id and status <> 'dihuni';
  end if;
  return new;
end $$;

drop trigger if exists warga_guard on public.warga;
create trigger warga_guard before insert or update on public.warga
  for each row execute function public._warga_guard();

create or replace function public._kontak_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.bypass', true), '') <> '1' and not public.is_admin()
     and new.nomor_hp is distinct from old.nomor_hp then
    raise exception 'Nomor HP dipakai untuk login dan hanya bisa diubah admin' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists kontak_guard on public.warga_kontak;
create trigger kontak_guard before update on public.warga_kontak
  for each row execute function public._kontak_guard();

-- 4c. Pengurus baru -> peran warga menjadi pengurus
create or replace function public._pengurus_peran() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.bypass', '1', true);
  if tg_op in ('INSERT', 'UPDATE') and new.aktif then
    update public.warga set role = 'pengurus' where id = new.warga_id and role = 'warga';
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    update public.warga w set role = 'warga'
    where w.id = old.warga_id and w.role = 'pengurus'
      and not exists (select 1 from public.pengurus p where p.warga_id = old.warga_id and p.aktif);
  end if;
  perform set_config('app.bypass', '', true);
  return coalesce(new, old);
end $$;

drop trigger if exists pengurus_peran on public.pengurus;
create trigger pengurus_peran after insert or update or delete on public.pengurus
  for each row execute function public._pengurus_peran();

-- 4d. Pengumuman baru -> notifikasi semua warga aktif
create or replace function public._pengumuman_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.warga where status = 'aktif' and id is distinct from new.dibuat_oleh;
  if ids is not null then
    perform public._notif(ids, 'Pengumuman baru: ' || new.judul, coalesce(new.ringkasan, left(new.isi, 120)), 'pengumuman', '/pengumuman/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'pengumuman', 'membuat pengumuman ' || new.judul, true);
  return new;
end $$;

drop trigger if exists pengumuman_baru on public.pengumuman;
create trigger pengumuman_baru after insert on public.pengumuman
  for each row execute function public._pengumuman_baru();

-- 4e. Kegiatan baru -> notifikasi
create or replace function public._kegiatan_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.warga where status = 'aktif' and id is distinct from new.dibuat_oleh;
  if ids is not null then
    perform public._notif(ids, 'Kegiatan mendatang: ' || new.judul,
      to_char(new.mulai at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' · ' || new.lokasi, 'kegiatan', '/kegiatan/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'kegiatan', 'menambahkan kegiatan ' || new.judul, true);
  return new;
end $$;

drop trigger if exists kegiatan_baru on public.kegiatan;
create trigger kegiatan_baru after insert on public.kegiatan
  for each row execute function public._kegiatan_baru();

-- 4f. Peserta kegiatan: cek kuota & waktu
create or replace function public._peserta_cek() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k public.kegiatan;
begin
  select * into k from public.kegiatan where id = new.kegiatan_id;
  if not found then raise exception 'Kegiatan tidak ditemukan'; end if;
  if not k.perlu_daftar then raise exception 'Kegiatan ini tidak memerlukan pendaftaran'; end if;
  if k.selesai < now() then raise exception 'Kegiatan sudah selesai'; end if;
  if k.kuota is not null and (select count(*) from public.kegiatan_peserta where kegiatan_id = k.id) >= k.kuota then
    raise exception 'Kuota kegiatan sudah penuh';
  end if;
  return new;
end $$;

drop trigger if exists peserta_cek on public.kegiatan_peserta;
create trigger peserta_cek before insert on public.kegiatan_peserta
  for each row execute function public._peserta_cek();

-- 4g. Laporan: notifikasi pengurus & pelapor
create or replace function public._laporan_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_nama text;
begin
  if tg_op = 'INSERT' then
    select nama into v_nama from public.warga where id = new.pelapor_id;
    perform public._notif_pengurus('Laporan baru: ' || new.judul, coalesce(v_nama, 'Warga') || ' mengirim laporan', 'laporan', '/admin/laporan');
    perform public._aktivitas(new.pelapor_id, 'aspirasi', 'membuat laporan ' || new.judul, false);
  elsif new.status is distinct from old.status or new.tanggapan is distinct from old.tanggapan then
    perform public._notif(array[new.pelapor_id],
      case new.status when 'diproses' then 'Laporan Anda diproses'
                      when 'selesai' then 'Laporan Anda selesai ditangani'
                      when 'ditolak' then 'Laporan Anda tidak dapat ditindaklanjuti'
                      else 'Laporan Anda diperbarui' end,
      new.judul || coalesce(' · ' || new.tanggapan, ''), 'laporan', '/aspirasi');
  end if;
  return new;
end $$;

drop trigger if exists laporan_notif on public.laporan;
create trigger laporan_notif after insert or update on public.laporan
  for each row execute function public._laporan_notif();

-- 4h. Pelapor hanya boleh mengubah isi laporan; pengurus mengubah status
create or replace function public._laporan_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_pengurus() then
    if new.status is distinct from old.status or new.tanggapan is distinct from old.tanggapan
       or new.ditangani_oleh is distinct from old.ditangani_oleh or new.pelapor_id is distinct from old.pelapor_id then
      raise exception 'Tidak diizinkan' using errcode = '42501';
    end if;
    if old.status <> 'baru' then raise exception 'Laporan yang sudah diproses tidak bisa diubah' using errcode = '42501'; end if;
  end if;
  if public.is_pengurus() and new.status is distinct from old.status then
    new.ditangani_oleh := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists laporan_guard on public.laporan;
create trigger laporan_guard before update on public.laporan
  for each row execute function public._laporan_guard();

-- ---------------------------------------------------------------------
-- 5. FUNGSI RPC (dipanggil dari aplikasi; semua memeriksa hak akses)
-- ---------------------------------------------------------------------

-- Pengguna Google melengkapi data pendaftaran
create or replace function public.lengkapi_pendaftaran(p_nama text, p_hp text, p_blok text, p_no_rumah text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp);
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if not exists (select 1 from public.warga where id = auth.uid() and status = 'menunggu') then
    raise exception 'Data hanya bisa dilengkapi saat menunggu persetujuan';
  end if;
  if char_length(btrim(coalesce(p_nama, ''))) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
  if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
  if not exists (select 1 from public.blok where kode = upper(p_blok)) then raise exception 'Blok tidak dikenal'; end if;
  if coalesce(p_no_rumah, '') !~ '^[0-9A-Za-z-]{1,6}$' then raise exception 'Nomor rumah tidak valid'; end if;
  if exists (select 1 from public.warga_kontak where nomor_hp = v_hp and warga_id <> auth.uid()) then
    raise exception 'Nomor HP sudah terdaftar';
  end if;
  perform set_config('app.bypass', '1', true);
  update public.warga set nama = left(btrim(p_nama), 80), blok = upper(p_blok), no_rumah = upper(btrim(p_no_rumah))
  where id = auth.uid();
  update public.warga_kontak set nomor_hp = v_hp where warga_id = auth.uid();
  perform set_config('app.bypass', '', true);
end $$;

-- Pengurus menyetujui anggota
create or replace function public.setujui_anggota(p_id uuid, p_kepala_keluarga boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.warga;
begin
  if not public.is_pengurus() then raise exception 'Hanya pengurus' using errcode = '42501'; end if;
  select * into w from public.warga where id = p_id;
  if not found then raise exception 'Warga tidak ditemukan'; end if;
  if w.blok is null or w.no_rumah is null then raise exception 'Blok dan nomor rumah belum diisi'; end if;
  perform set_config('app.bypass', '1', true);
  update public.warga
     set status = 'aktif', alasan_status = null, kepala_keluarga = coalesce(p_kepala_keluarga, false),
         bergabung_at = coalesce(bergabung_at, now()), disetujui_oleh = auth.uid()
   where id = p_id;
  perform set_config('app.bypass', '', true);
  perform public._notif(array[p_id], 'Selamat datang', 'Terima kasih telah bergabung. Akun Anda sudah aktif.', 'akun', '/');
  perform public._aktivitas(auth.uid(), 'anggota', 'menyetujui anggota ' || w.nama, false);
end $$;

create or replace function public.tolak_anggota(p_id uuid, p_alasan text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_pengurus() then raise exception 'Hanya pengurus' using errcode = '42501'; end if;
  if exists (select 1 from public.warga where id = p_id and status = 'aktif' and role = 'admin') then
    raise exception 'Admin tidak bisa ditolak';
  end if;
  perform set_config('app.bypass', '1', true);
  update public.warga set status = 'ditolak', alasan_status = left(nullif(btrim(p_alasan), ''), 300)
   where id = p_id and status = 'menunggu';
  perform set_config('app.bypass', '', true);
end $$;

-- Kontak warga sesuai pengaturan privasi pemiliknya
create or replace function public.kontak_warga(p_id uuid)
returns table (nomor_hp text, email text) language sql stable security definer set search_path = '' as $$
  select case when k.tampilkan_hp or public.is_pengurus() or k.warga_id = auth.uid() then k.nomor_hp end,
         case when k.tampilkan_email or public.is_pengurus() or k.warga_id = auth.uid() then k.email end
  from public.warga_kontak k join public.warga w on w.id = k.warga_id
  where k.warga_id = p_id and w.status = 'aktif' and public.is_aktif()
$$;

-- Ubah kata sandi sendiri (wajib sandi lama). Tidak memerlukan email.
create or replace function public.ubah_sandi(p_lama text, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if char_length(coalesce(p_baru, '')) < 8 then raise exception 'Kata sandi baru minimal 8 karakter'; end if;
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  if coalesce(v_hash, '') <> '' and v_hash <> extensions.crypt(coalesce(p_lama, ''), v_hash) then
    raise exception 'Kata sandi lama salah';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = auth.uid();
end $$;

-- Admin mengatur ulang kata sandi warga yang lupa
create or replace function public.reset_sandi_warga(p_id uuid, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if char_length(coalesce(p_baru, '')) < 8 then raise exception 'Kata sandi minimal 8 karakter'; end if;
  if not exists (select 1 from auth.users where id = p_id and coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email') then
    raise exception 'Akun ini masuk dengan Google, kata sandinya tidak bisa diatur';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_id;
  perform public._aktivitas(auth.uid(), 'anggota', 'mengatur ulang kata sandi seorang warga', false);
end $$;

-- Admin menghapus akun warga beserta datanya
create or replace function public.hapus_warga(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if p_id = auth.uid() then raise exception 'Tidak bisa menghapus akun sendiri'; end if;
  if exists (select 1 from public.warga where id = p_id and role = 'admin') then
    raise exception 'Turunkan peran admin terlebih dahulu';
  end if;
  delete from auth.users where id = p_id;
end $$;

-- Buat tagihan IPL bulanan untuk semua rumah dihuni
create or replace function public.buat_tagihan_ipl(p_periode date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_periode date := date_trunc('month', p_periode)::date; v_jumlah integer; s public.pengaturan;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into s from public.pengaturan where id = 1;
  insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select r.id, v_periode, coalesce(r.tarif_ipl, s.tarif_ipl), v_periode + (s.jatuh_tempo_hari - 1)
  from public.rumah r where r.status = 'dihuni'
  on conflict (rumah_id, periode) do nothing;
  get diagnostics v_jumlah = row_count;
  if v_jumlah > 0 then
    perform public._notif(
      (select array_agg(w.id) from public.warga w join public.tagihan_ipl t on t.rumah_id = w.rumah_id
        where t.periode = v_periode and w.status = 'aktif'),
      'Tagihan IPL ' || public._nama_periode(v_periode), 'Tagihan IPL bulan ini sudah terbit', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'ipl', 'menerbitkan tagihan IPL ' || public._nama_periode(v_periode), false);
  end if;
  return v_jumlah;
end $$;

-- Warga mengirim bukti pembayaran untuk satu atau beberapa tagihan
create or replace function public.kirim_pembayaran(p_tagihan uuid[], p_bukti_path text, p_catatan text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_rumah uuid := public.rumah_saya(); v_total integer; v_n integer; v_id uuid; v_nama text;
begin
  if v_rumah is null then raise exception 'Akun Anda belum terhubung ke rumah' using errcode = '42501'; end if;
  if coalesce(array_length(p_tagihan, 1), 0) = 0 then raise exception 'Pilih tagihan'; end if;
  if p_bukti_path is null or split_part(p_bukti_path, '/', 1) <> 'ipl' or split_part(p_bukti_path, '/', 2) <> auth.uid()::text then
    raise exception 'Bukti pembayaran tidak valid';
  end if;
  select count(*), sum(nominal) into v_n, v_total from public.tagihan_ipl
   where id = any (p_tagihan) and rumah_id = v_rumah and status = 'belum_bayar';
  if v_n <> array_length(p_tagihan, 1) then raise exception 'Ada tagihan yang tidak valid atau sudah dibayar'; end if;
  insert into public.pembayaran_ipl (warga_id, rumah_id, jumlah, bukti_path, catatan)
  values (auth.uid(), v_rumah, greatest(v_total, 1), p_bukti_path, left(p_catatan, 300)) returning id into v_id;
  update public.tagihan_ipl set status = 'menunggu_verifikasi', pembayaran_id = v_id where id = any (p_tagihan);
  select nama into v_nama from public.warga where id = auth.uid();
  perform public._notif_pengurus('Bukti pembayaran IPL baru', v_nama || ' mengunggah bukti pembayaran', 'ipl', '/admin/ipl', true);
  perform public._aktivitas(auth.uid(), 'ipl', 'mengunggah bukti pembayaran IPL', false);
  return v_id;
end $$;

-- Bendahara memverifikasi pembayaran
create or replace function public.verifikasi_pembayaran(p_id uuid, p_terima boolean, p_alasan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.pembayaran_ipl; t record; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into p from public.pembayaran_ipl where id = p_id for update;
  if not found or p.status <> 'menunggu' then raise exception 'Pembayaran tidak ditemukan atau sudah diverifikasi'; end if;
  select kode into v_kode from public.rumah where id = p.rumah_id;
  if p_terima then
    update public.pembayaran_ipl set status = 'diterima', diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    for t in select * from public.tagihan_ipl where pembayaran_id = p_id loop
      update public.tagihan_ipl set status = 'lunas', dibayar_at = p.created_at, metode = 'transfer' where id = t.id;
      insert into public.transaksi_kas (jenis, kategori, jumlah, tanggal, keterangan, sumber, pembayaran_id, tagihan_id, bukti_path, dibuat_oleh)
      values ('pemasukan', 'Iuran IPL', t.nominal, (p.created_at at time zone 'Asia/Jakarta')::date,
              'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode, 'ipl', p_id, t.id, p.bukti_path, auth.uid())
      on conflict (tagihan_id) do nothing;
    end loop;
    perform public._notif(array[p.warga_id], 'Pembayaran IPL diverifikasi', 'Pembayaran Rp ' || p.jumlah || ' telah diterima', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'keuangan', 'menyetujui pembayaran IPL ' || v_kode, false);
  else
    update public.pembayaran_ipl set status = 'ditolak', alasan_tolak = left(nullif(btrim(p_alasan), ''), 300),
           diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    update public.tagihan_ipl set status = 'belum_bayar', pembayaran_id = null where pembayaran_id = p_id;
    perform public._notif(array[p.warga_id], 'Bukti pembayaran IPL ditolak', coalesce(p_alasan, 'Silakan unggah ulang bukti yang benar'), 'ipl', '/ipl');
  end if;
end $$;

-- Bendahara mencatat pembayaran tunai
create or replace function public.tandai_lunas_tunai(p_tagihan uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tagihan_ipl; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into t from public.tagihan_ipl where id = p_tagihan for update;
  if not found or t.status = 'lunas' then raise exception 'Tagihan tidak ditemukan atau sudah lunas'; end if;
  if t.status = 'menunggu_verifikasi' then raise exception 'Tagihan ini sedang menunggu verifikasi bukti transfer'; end if;
  select kode into v_kode from public.rumah where id = t.rumah_id;
  update public.tagihan_ipl set status = 'lunas', dibayar_at = now(), metode = 'tunai' where id = t.id;
  if t.nominal > 0 then
    insert into public.transaksi_kas (jenis, kategori, jumlah, keterangan, sumber, tagihan_id, dibuat_oleh)
    values ('pemasukan', 'Iuran IPL', t.nominal, 'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode || ' (tunai)', 'ipl', t.id, auth.uid());
  end if;
  perform public._notif((select array_agg(id) from public.warga where rumah_id = t.rumah_id),
    'Pembayaran IPL tercatat', 'IPL ' || public._nama_periode(t.periode) || ' lunas (tunai)', 'ipl', '/ipl');
end $$;

-- Tandai notifikasi dibaca (semua bila p_ids null)
create or replace function public.tandai_dibaca(p_ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifikasi set dibaca_at = now()
  where warga_id = auth.uid() and dibaca_at is null and (p_ids is null or id = any (p_ids));
$$;

-- Statistik dashboard (angka agregat, tanpa data pribadi)
create or replace function public.statistik_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_periode date;
  r jsonb;
begin
  if not public.is_aktif() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select max(periode) into v_periode from public.tagihan_ipl where periode <= date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  if v_periode is null then select max(periode) into v_periode from public.tagihan_ipl; end if;
  select jsonb_build_object(
    'total_warga', (select count(*) from public.warga where status = 'aktif'),
    'kepala_keluarga', (select count(*) from public.warga where status = 'aktif' and kepala_keluarga),
    'pengurus_aktif', (select count(distinct p.warga_id) from public.pengurus p join public.warga w on w.id = p.warga_id where p.aktif and w.status = 'aktif'),
    'pengurus_total', (select count(distinct warga_id) from public.pengurus),
    'total_rumah', (select count(*) from public.rumah),
    'rumah_dihuni', (select count(*) from public.rumah where status = 'dihuni'),
    'periode_ipl', v_periode,
    'ipl_total_tagihan', (select coalesce(sum(nominal), 0) from public.tagihan_ipl where periode = v_periode),
    'ipl_lunas', (select count(*) from public.tagihan_ipl where periode = v_periode and status = 'lunas'),
    'ipl_belum', (select count(*) from public.tagihan_ipl where periode = v_periode and status <> 'lunas'),
    'saldo_kas', (select coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end), 0) from public.transaksi_kas),
    'anggota_menunggu', case when public.is_pengurus() then (select count(*) from public.warga where status = 'menunggu') end,
    'pembayaran_menunggu', case when public.is_bendahara() then (select count(*) from public.pembayaran_ipl where status = 'menunggu') end,
    'laporan_baru', case when public.is_pengurus() then (select count(*) from public.laporan where status in ('baru', 'diproses')) end
  ) into r;
  return r;
end $$;

create or replace function public.statistik_ipl_bulanan(p_tahun integer)
returns table (bulan integer, lunas bigint, belum bigint) language sql stable security definer set search_path = '' as $$
  select m.bulan,
         count(t.id) filter (where t.status = 'lunas'),
         count(t.id) filter (where t.status <> 'lunas')
  from generate_series(1, 12) as m(bulan)
  left join public.tagihan_ipl t
    on extract(year from t.periode) = p_tahun and extract(month from t.periode) = m.bulan
  where public.is_aktif()
  group by m.bulan order by m.bulan
$$;

create or replace function public.ringkasan_kas(p_bulan date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_aktif() then jsonb_build_object(
    'saldo', coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end), 0),
    'pemasukan_bulan', coalesce(sum(jumlah) filter (where jenis = 'pemasukan' and date_trunc('month', tanggal) = date_trunc('month', p_bulan)), 0),
    'pengeluaran_bulan', coalesce(sum(jumlah) filter (where jenis = 'pengeluaran' and date_trunc('month', tanggal) = date_trunc('month', p_bulan)), 0)
  ) end
  from public.transaksi_kas
$$;

-- Hanya untuk SQL Editor: jadikan seseorang admin pertama
create or replace function public.jadikan_admin(p_nomor_hp text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select warga_id into v_id from public.warga_kontak where nomor_hp = public.normalisasi_hp(p_nomor_hp);
  if v_id is null then
    select id into v_id from auth.users where lower(email) = lower(btrim(p_nomor_hp));
  end if;
  if v_id is null then return 'Akun tidak ditemukan. Daftar dulu lewat aplikasi.'; end if;
  perform set_config('app.bypass', '1', true);
  update public.warga set role = 'admin', status = 'aktif', alasan_status = null, bergabung_at = coalesce(bergabung_at, now())
   where id = v_id;
  return 'Berhasil: akun sekarang Admin aktif.';
end $$;

-- ---------------------------------------------------------------------
-- 6. HAK EKSEKUSI FUNGSI
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on function public._notif(uuid[], text, text, text, text) from authenticated;
revoke execute on function public._notif_pengurus(text, text, text, text, boolean) from authenticated;
revoke execute on function public._aktivitas(uuid, text, text, boolean) from authenticated;
revoke execute on function public._user_baru() from authenticated;
revoke execute on function public.jadikan_admin(text) from authenticated;
grant execute on function public.normalisasi_hp(text) to anon, authenticated;
grant execute on function public.is_aktif() to authenticated;
grant execute on function public.is_pengurus() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.rumah_saya() to authenticated;
grant execute on function public.hak_saya() to authenticated;
grant execute on function public.lengkapi_pendaftaran(text, text, text, text) to authenticated;
grant execute on function public.setujui_anggota(uuid, boolean) to authenticated;
grant execute on function public.tolak_anggota(uuid, text) to authenticated;
grant execute on function public.kontak_warga(uuid) to authenticated;
grant execute on function public.ubah_sandi(text, text) to authenticated;
grant execute on function public.reset_sandi_warga(uuid, text) to authenticated;
grant execute on function public.hapus_warga(uuid) to authenticated;
grant execute on function public.buat_tagihan_ipl(date) to authenticated;
grant execute on function public.kirim_pembayaran(uuid[], text, text) to authenticated;
grant execute on function public.verifikasi_pembayaran(uuid, boolean, text) to authenticated;
grant execute on function public.tandai_lunas_tunai(uuid) to authenticated;
grant execute on function public.tandai_dibaca(uuid[]) to authenticated;
grant execute on function public.statistik_dashboard() to authenticated;
grant execute on function public.statistik_ipl_bulanan(integer) to authenticated;
grant execute on function public.ringkasan_kas(date) to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.pengaturan enable row level security;
alter table public.blok enable row level security;
alter table public.rumah enable row level security;
alter table public.warga enable row level security;
alter table public.warga_kontak enable row level security;
alter table public.pengurus enable row level security;
alter table public.tagihan_ipl enable row level security;
alter table public.pembayaran_ipl enable row level security;
alter table public.transaksi_kas enable row level security;
alter table public.pengumuman enable row level security;
alter table public.kegiatan enable row level security;
alter table public.kegiatan_peserta enable row level security;
alter table public.laporan enable row level security;
alter table public.notifikasi enable row level security;
alter table public.aktivitas enable row level security;
alter table public.kontak_darurat enable row level security;

-- Hapus kebijakan lama (agar file aman dijalankan ulang)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- pengaturan: dibaca siapa saja (nama paguyuban tampil di halaman login), diubah admin
create policy pengaturan_baca on public.pengaturan for select to anon, authenticated using (true);
create policy pengaturan_ubah on public.pengaturan for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- blok: dibaca siapa saja (formulir pendaftaran), dikelola admin
create policy blok_baca on public.blok for select to anon, authenticated using (true);
create policy blok_kelola on public.blok for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- rumah
create policy rumah_baca on public.rumah for select to authenticated using (public.is_aktif());
create policy rumah_kelola on public.rumah for all to authenticated using (public.is_admin() or public.is_bendahara()) with check (public.is_admin() or public.is_bendahara());

-- warga
create policy warga_baca on public.warga for select to authenticated
  using (id = auth.uid() or public.is_pengurus() or (status = 'aktif' and public.is_aktif()));
create policy warga_ubah_diri on public.warga for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy warga_ubah_admin on public.warga for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- warga_kontak: data pribadi
create policy kontak_baca on public.warga_kontak for select to authenticated
  using (warga_id = auth.uid() or public.is_pengurus());
create policy kontak_ubah on public.warga_kontak for update to authenticated
  using (warga_id = auth.uid() or public.is_admin()) with check (warga_id = auth.uid() or public.is_admin());

-- pengurus
create policy pengurus_baca on public.pengurus for select to authenticated using (public.is_aktif());
create policy pengurus_kelola on public.pengurus for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tagihan & pembayaran IPL
create policy tagihan_baca on public.tagihan_ipl for select to authenticated
  using (rumah_id = public.rumah_saya() or public.is_bendahara());
create policy tagihan_kelola on public.tagihan_ipl for all to authenticated
  using (public.is_bendahara()) with check (public.is_bendahara());
create policy pembayaran_baca on public.pembayaran_ipl for select to authenticated
  using (warga_id = auth.uid() or rumah_id = public.rumah_saya() or public.is_bendahara());

-- kas: transparan untuk semua anggota aktif, dikelola bendahara
create policy kas_baca on public.transaksi_kas for select to authenticated using (public.is_aktif());
create policy kas_tambah on public.transaksi_kas for insert to authenticated
  with check (public.is_bendahara() and sumber = 'manual');
create policy kas_ubah on public.transaksi_kas for update to authenticated
  using (public.is_bendahara() and sumber = 'manual') with check (public.is_bendahara() and sumber = 'manual');
create policy kas_hapus on public.transaksi_kas for delete to authenticated
  using (public.is_bendahara() and sumber = 'manual');

-- pengumuman & kegiatan
create policy pengumuman_baca on public.pengumuman for select to authenticated using (public.is_aktif());
create policy pengumuman_kelola on public.pengumuman for all to authenticated
  using (public.is_pengurus()) with check (public.is_pengurus());
create policy kegiatan_baca on public.kegiatan for select to authenticated using (public.is_aktif());
create policy kegiatan_kelola on public.kegiatan for all to authenticated
  using (public.is_pengurus()) with check (public.is_pengurus());
create policy peserta_baca on public.kegiatan_peserta for select to authenticated using (public.is_aktif());
create policy peserta_daftar on public.kegiatan_peserta for insert to authenticated
  with check (warga_id = auth.uid() and public.is_aktif());
create policy peserta_batal on public.kegiatan_peserta for delete to authenticated
  using (warga_id = auth.uid() or public.is_pengurus());

-- laporan: pelapor melihat miliknya, pengurus melihat semua
create policy laporan_baca on public.laporan for select to authenticated
  using (pelapor_id = auth.uid() or public.is_pengurus());
create policy laporan_buat on public.laporan for insert to authenticated
  with check (pelapor_id = auth.uid() and public.is_aktif() and status = 'baru' and tanggapan is null);
create policy laporan_ubah on public.laporan for update to authenticated
  using (pelapor_id = auth.uid() or public.is_pengurus()) with check (pelapor_id = auth.uid() or public.is_pengurus());
create policy laporan_hapus on public.laporan for delete to authenticated
  using ((pelapor_id = auth.uid() and status = 'baru') or public.is_admin());

-- notifikasi: hanya pemilik
create policy notifikasi_baca on public.notifikasi for select to authenticated using (warga_id = auth.uid());
create policy notifikasi_hapus on public.notifikasi for delete to authenticated using (warga_id = auth.uid());

-- aktivitas
create policy aktivitas_baca on public.aktivitas for select to authenticated
  using (public.is_pengurus() or pelaku_id = auth.uid() or (publik and public.is_aktif()));

-- kontak darurat
create policy darurat_baca on public.kontak_darurat for select to authenticated using (public.is_aktif());
create policy darurat_kelola on public.kontak_darurat for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tabel tanpa akses anon sama sekali (lapisan pengaman tambahan)
revoke all on public.rumah, public.warga, public.warga_kontak, public.pengurus, public.tagihan_ipl,
  public.pembayaran_ipl, public.transaksi_kas, public.pengumuman, public.kegiatan, public.kegiatan_peserta,
  public.laporan, public.notifikasi, public.aktivitas, public.kontak_darurat from anon;
revoke insert, update, delete on public.pengaturan, public.blok from anon;
-- Notifikasi & aktivitas & pembayaran hanya ditulis lewat fungsi
revoke insert, update on public.notifikasi, public.aktivitas from authenticated;
revoke insert, update, delete on public.pembayaran_ipl from authenticated;
revoke insert, delete on public.warga, public.warga_kontak from authenticated;

-- Realtime untuk lencana notifikasi
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifikasi') then
    alter publication supabase_realtime add table public.notifikasi;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. PENYIMPANAN FILE (Supabase Storage)
--    publik : foto lingkungan (dapat dilihat publik)
--    konten : foto profil, pengumuman, kegiatan, laporan (anggota)
--    bukti  : bukti transfer IPL & nota kas (pemilik + bendahara)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('publik', 'publik', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('konten', 'konten', false, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('bukti', 'bukti', false, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pw publik tulis" on storage.objects;
drop policy if exists "pw publik ubah" on storage.objects;
drop policy if exists "pw publik hapus" on storage.objects;
drop policy if exists "pw konten baca" on storage.objects;
drop policy if exists "pw konten tulis" on storage.objects;
drop policy if exists "pw konten hapus" on storage.objects;
drop policy if exists "pw bukti baca" on storage.objects;
drop policy if exists "pw bukti tulis" on storage.objects;
drop policy if exists "pw bukti hapus" on storage.objects;

create policy "pw publik tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'publik' and public.is_admin());
create policy "pw publik ubah" on storage.objects for update to authenticated
  using (bucket_id = 'publik' and public.is_admin());
create policy "pw publik hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'publik' and public.is_admin());

create policy "pw konten baca" on storage.objects for select to authenticated
  using (bucket_id = 'konten' and public.is_aktif() and (
    (storage.foldername(name))[1] in ('avatar', 'pengumuman', 'kegiatan')
    or ((storage.foldername(name))[1] = 'laporan' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_pengurus()))
  ));
create policy "pw konten tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'konten' and (
    ((storage.foldername(name))[1] = 'avatar' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'laporan' and (storage.foldername(name))[2] = auth.uid()::text and public.is_aktif())
    or ((storage.foldername(name))[1] in ('pengumuman', 'kegiatan') and public.is_pengurus())
  ));
create policy "pw konten hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'konten' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_pengurus()));

create policy "pw bukti baca" on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and ((storage.foldername(name))[2] = auth.uid()::text or public.is_bendahara()
    or ((storage.foldername(name))[1] = 'kas' and public.is_aktif())));
create policy "pw bukti tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti' and (
    ((storage.foldername(name))[1] = 'ipl' and (storage.foldername(name))[2] = auth.uid()::text and public.is_aktif())
    or ((storage.foldername(name))[1] = 'kas' and public.is_bendahara())
  ));
create policy "pw bukti hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'bukti' and public.is_bendahara());

-- #####################################################################
-- ##  BERKAS: 02-data-awal.sql
-- #####################################################################
-- =====================================================================
-- Data awal. Jalankan setelah 01-skema.sql. Sesuaikan isinya dengan
-- lingkungan Anda (boleh juga diubah nanti lewat menu Admin di aplikasi).
-- =====================================================================

-- Profil paguyuban
update public.pengaturan set
  nama_paguyuban  = 'Paguyuban Warga Digital',
  tagline         = 'Bersama Membangun Lingkungan yang Lebih Baik',
  nama_lingkungan = 'Perumahan Vila Gading Royal',
  rt = '', rw = '',                            -- isi RT/RW di menu Pengaturan paguyuban bila ada
  alamat = 'Desa Pamegarsari, Kec. Parung, Kab. Bogor',
  luas_wilayah = '2,5 Ha',
  latitude = -6.4310, longitude = 106.7290,   -- untuk widget cuaca
  tarif_ipl = 70000,
  jatuh_tempo_hari = 10,
  bank_nama = 'BCA',
  bank_norek = '1234 5678 9010',
  bank_atas_nama = 'Paguyuban Warga'
where id = 1;

-- Daftar blok
insert into public.blok (kode, nama, urutan) values
  ('A', 'Blok A', 1), ('B', 'Blok B', 2), ('C', 'Blok C', 3), ('D', 'Blok D', 4)
on conflict (kode) do nothing;

-- Kontak darurat (ganti dengan nomor yang benar)
insert into public.kontak_darurat (nama, nomor, keterangan, urutan)
select * from (values
  ('Pos Satpam', '0812 0000 0001', 'Siaga 24 jam', 1),
  ('Ketua RT', '0812 0000 0002', 'Urusan lingkungan', 2),
  ('Polisi', '110', 'Darurat kepolisian', 3),
  ('Ambulans', '118', 'Darurat medis', 4),
  ('Pemadam Kebakaran', '113', 'Kebakaran', 5)
) as v(nama, nomor, keterangan, urutan)
where not exists (select 1 from public.kontak_darurat);

-- #####################################################################
-- ##  BERKAS: 03-pin-angka.sql
-- #####################################################################
-- =====================================================================
-- 03-pin-angka.sql
-- Mengubah aturan kata sandi menjadi PIN angka minimal 6 digit
-- =====================================================================

-- 1. Warga mengubah PIN sendiri (wajib PIN/sandi lama)
create or replace function public.ubah_sandi(p_lama text, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if coalesce(p_baru, '') !~ '^[0-9]{6,}$' then
    raise exception 'PIN baru harus berupa angka minimal 6 digit';
  end if;
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  if coalesce(v_hash, '') <> '' and v_hash <> extensions.crypt(coalesce(p_lama, ''), v_hash) then
    raise exception 'PIN lama salah';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = auth.uid();
end $$;

-- 2. Admin mengatur ulang PIN warga yang lupa
create or replace function public.reset_sandi_warga(p_id uuid, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if coalesce(p_baru, '') !~ '^[0-9]{6,}$' then
    raise exception 'PIN harus berupa angka minimal 6 digit';
  end if;
  if not exists (select 1 from auth.users where id = p_id and coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email') then
    raise exception 'Akun ini masuk dengan Google, PIN tidak bisa diatur';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_id;
  perform public._aktivitas(auth.uid(), 'anggota', 'mengatur ulang PIN seorang warga', false);
end $$;

grant execute on function public.ubah_sandi(text, text) to authenticated;
grant execute on function public.reset_sandi_warga(uuid, text) to authenticated;
-- #####################################################################
-- ##  BERKAS: 04-import-warga.sql
-- #####################################################################
-- =====================================================================
-- 04-import-warga.sql
-- Import warga massal (admin) + kewajiban ganti PIN saat pertama masuk.
-- Jalankan SETELAH 01, 02 dan 03. Aman dijalankan ulang.
-- PENTING: jalankan berkas ini SEBELUM men-deploy versi aplikasi baru,
-- karena aplikasi membaca kolom wajib_ganti_pin.
-- =====================================================================

-- 1. Penanda "wajib ganti PIN"
alter table public.warga add column if not exists wajib_ganti_pin boolean not null default false;

-- 2. Trigger akun baru: jangan kirim ratusan notifikasi saat import
create or replace function public._user_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_nama text;
  v_blok text;
  v_no text;
  v_hp text;
begin
  v_nama := left(btrim(coalesce(m ->> 'nama', m ->> 'full_name', m ->> 'name', '')), 80);
  if char_length(v_nama) < 2 then v_nama := 'Warga Baru'; end if;
  v_blok := upper(btrim(coalesce(m ->> 'blok', '')));
  if not exists (select 1 from public.blok b where b.kode = v_blok) then v_blok := null; end if;
  v_no := nullif(btrim(coalesce(m ->> 'no_rumah', '')), '');
  if v_no !~ '^[0-9A-Za-z-]{1,6}$' then v_no := null; end if;
  v_hp := public.normalisasi_hp(m ->> 'nomor_hp');

  insert into public.warga (id, nama, blok, no_rumah)
  values (new.id, v_nama, v_blok, v_no)
  on conflict (id) do nothing;

  insert into public.warga_kontak (warga_id, nomor_hp, email)
  values (new.id, v_hp, case when v_provider = 'email' then null else new.email end)
  on conflict (warga_id) do nothing;

  if coalesce(current_setting('app.import', true), '') <> '1' then
    perform public._notif_pengurus('Pendaftaran anggota baru', v_nama || ' menunggu verifikasi', 'akun', '/admin/verifikasi');
  end if;
  return new;
end $$;

-- 3. Import warga. p_rows: [{nama, hp, blok, no_rumah, pekerjaan?, kepala_keluarga?}]
--    p_domain: domain email internal (sama dengan VITE_AUTH_EMAIL_DOMAIN)
--    Hasil: {"dibuat": n, "dilewati": [{"baris": 3, "nama": "...", "alasan": "..."}]}
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default '123456')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' then raise exception 'PIN awal harus 6 angka'; end if;

  perform set_config('app.import', '1', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
      v_hp := public.normalisasi_hp(r ->> 'hp');
      v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
      v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
      v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60);

      if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
      if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok % tidak dikenal', v_blok; end if;
      if v_no !~ '^[0-9A-Z-]{1,6}$' then raise exception 'Nomor rumah tidak valid'; end if;

      v_email := v_hp || '@' || v_domain;
      if exists (select 1 from public.warga_kontak where nomor_hp = v_hp)
         or exists (select 1 from auth.users where lower(email) = v_email) then
        raise exception 'Nomor HP sudah terdaftar';
      end if;

      v_id := gen_random_uuid();

      -- akun login (email internal = nomor HP), tanpa konfirmasi email
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', v_nama, 'nomor_hp', v_hp, 'blok', v_blok, 'no_rumah', v_no),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now());

      -- trigger _user_baru sudah membuat baris warga (menunggu); aktifkan
      v_kk := case lower(coalesce(r ->> 'kepala_keluarga', ''))
                when 'ya' then true when 'y' then true when 'true' then true when '1' then true when 'kk' then true
                when 'tidak' then false when 'n' then false when 'false' then false when '0' then false
                else not exists (select 1 from public.warga w where w.blok = v_blok and w.no_rumah = v_no and w.kepala_keluarga)
              end;

      perform set_config('app.bypass', '1', true);
      update public.warga
         set status = 'aktif', kepala_keluarga = v_kk, pekerjaan = coalesce(v_kerja, pekerjaan),
             bergabung_at = now(), disetujui_oleh = auth.uid(), wajib_ganti_pin = true
       where id = v_id;
      perform set_config('app.bypass', '', true);

      v_dibuat := v_dibuat + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', coalesce(r ->> 'nama', ''), 'alasan', sqlerrm));
    end;
  end loop;

  perform set_config('app.import', '', true);
  if v_dibuat > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'mengimpor ' || v_dibuat || ' warga', false);
  end if;
  return jsonb_build_object('dibuat', v_dibuat, 'dilewati', v_skip);
end $$;

revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;

-- 4. Ganti PIN sendiri: menghapus tanda wajib ganti, PIN baru harus berbeda
create or replace function public.ubah_sandi(p_lama text, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if coalesce(p_baru, '') !~ '^[0-9]{6,}$' then
    raise exception 'PIN baru harus berupa angka minimal 6 digit';
  end if;
  if p_baru = coalesce(p_lama, '') then raise exception 'PIN baru harus berbeda dari PIN lama'; end if;
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  if coalesce(v_hash, '') <> '' and v_hash <> extensions.crypt(coalesce(p_lama, ''), v_hash) then
    raise exception 'PIN lama salah';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = auth.uid();
  update public.warga set wajib_ganti_pin = false where id = auth.uid() and wajib_ganti_pin;
end $$;

-- 5. Admin mengatur ulang PIN: warga wajib menggantinya saat masuk berikutnya
create or replace function public.reset_sandi_warga(p_id uuid, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if coalesce(p_baru, '') !~ '^[0-9]{6,}$' then
    raise exception 'PIN harus berupa angka minimal 6 digit';
  end if;
  if not exists (select 1 from auth.users where id = p_id and coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email') then
    raise exception 'Akun ini masuk dengan Google, PIN tidak bisa diatur';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_id;
  perform set_config('app.bypass', '1', true);
  update public.warga set wajib_ganti_pin = true where id = p_id;
  perform set_config('app.bypass', '', true);
  perform public._aktivitas(auth.uid(), 'anggota', 'mengatur ulang PIN seorang warga', false);
end $$;

grant execute on function public.ubah_sandi(text, text) to authenticated;
grant execute on function public.reset_sandi_warga(uuid, text) to authenticated;

-- #####################################################################
-- ##  BERKAS: 05-struktur-pengurus.sql
-- #####################################################################
-- =====================================================================
-- 05-struktur-pengurus.sql
-- Struktur organisasi paguyuban & hak akses berbasis peran (RBAC):
--   Ketua · Wakil Ketua · Sekretaris · Bendahara · Humas Gang · Seksi
-- Juga menambah: persetujuan Ketua untuk pengeluaran kas besar,
-- arsip administrasi (surat & notulen), serta pengumuman/kegiatan per blok/gang.
--
-- Jalankan SETELAH 01, 02, 03, dan 04. Aman dijalankan ulang.
-- Tidak menghapus data warga. Kolom baru diisi otomatis dari data lama
-- (mis. jabatan "Bendahara" -> peran 'bendahara').
--
-- Wilayah: satu BLOK (mis. Blok C) berisi beberapa GANG / JALAN
-- (mis. Jl. Zamrud, Jl. Safir). Alamat warga: Blok C 3/5 · Jl. Zamrud.
-- Humas memegang satu gang/jalan dan mengelola warga di gang tersebut.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KOLOM & TABEL BARU
-- ---------------------------------------------------------------------

-- 1a. Gang / jalan di dalam blok
create table if not exists public.gang (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(btrim(nama)) between 2 and 60),
  blok text references public.blok(kode) on update cascade on delete set null, -- kosong = melintasi beberapa blok
  urutan integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists gang_nama_blok_uniq on public.gang (lower(btrim(nama)), coalesce(blok, ''));

alter table public.warga add column if not exists gang_id uuid references public.gang(id) on delete set null;
create index if not exists warga_gang_idx on public.warga (gang_id);

-- Nomor rumah boleh berformat 3/5, 12A, C.3, 10-B (maks. 10 karakter)
create or replace function public.nomor_rumah_valid(p text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p, '') ~ '^[0-9A-Za-z][0-9A-Za-z/.-]{0,9}$'
$$;
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.warga'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ~ 'no_rumah' loop
    execute format('alter table public.warga drop constraint %I', c);
  end loop;
  alter table public.warga add constraint warga_no_rumah_check check (no_rumah ~ '^[0-9A-Za-z][0-9A-Za-z/.-]{0,9}$');
  for c in select conname from pg_constraint where conrelid = 'public.rumah'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ~ 'nomor' loop
    execute format('alter table public.rumah drop constraint %I', c);
  end loop;
  alter table public.rumah add constraint rumah_nomor_check check (nomor ~ '^[0-9A-Za-z][0-9A-Za-z/.-]{0,9}$');
end $$;

-- Label alamat: "Blok C 3/5 · Jl. Zamrud"
create or replace function public.label_alamat(p_blok text, p_no text, p_gang uuid) returns text
language sql stable security definer set search_path = '' as $$
  select nullif(concat_ws(' · ', nullif(btrim(concat_ws(' ', 'Blok ' || p_blok, p_no)), ''),
                          (select g.nama from public.gang g where g.id = p_gang)), '')
$$;

-- Cari gang dari teks jabatan, mis. "Humas Jl. Zamrud" -> gang "Jl. Zamrud"
create or replace function public._gang_dari_teks(p_teks text) returns uuid
language sql stable set search_path = '' as $$
  select g.id from public.gang g
  cross join lateral (select lower(btrim(regexp_replace(g.nama, '^\s*(jl\.?|jln\.?|jalan|gang|gg\.?)\s*', '', 'i'))) as inti) x
  where char_length(x.inti) >= 3 and position(x.inti in lower(coalesce(p_teks, ''))) > 0
  order by char_length(x.inti) desc limit 1
$$;

-- 1b. Peran terstruktur & gang yang dipegang humas
alter table public.pengurus add column if not exists peran text;
alter table public.pengurus add column if not exists wilayah_gang uuid references public.gang(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pengurus_peran_check') then
    alter table public.pengurus add constraint pengurus_peran_check
      check (peran in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'seksi'));
  end if;
end $$;

-- Tebak peran dari teks jabatan (dipakai untuk data lama & aplikasi versi lama)
create or replace function public._peran_dari_jabatan(p_jabatan text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_jabatan ~* 'wakil' then 'wakil_ketua'
    when p_jabatan ~* 'ketua' then 'ketua'
    when p_jabatan ~* '(sekretaris|sekertaris|sekretariat)' then 'sekretaris'
    when p_jabatan ~* 'bendahara' then 'bendahara'
    when p_jabatan ~* '(humas|hubungan masyarakat)' then 'humas'
    else 'seksi'
  end
$$;

create or replace function public._pengurus_isi_peran() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.peran is null then new.peran := public._peran_dari_jabatan(new.jabatan); end if;
  -- "Humas Jl. Zamrud" -> gang otomatis bila belum dipilih
  if new.peran = 'humas' and new.wilayah_gang is null then
    new.wilayah_gang := public._gang_dari_teks(new.jabatan);
  end if;
  if new.peran <> 'humas' then new.wilayah_gang := null; end if;
  return new;
end $$;

drop trigger if exists pengurus_isi_peran on public.pengurus;
create trigger pengurus_isi_peran before insert or update on public.pengurus
  for each row execute function public._pengurus_isi_peran();

-- Isi data lama (trigger di atas yang menghitung)
update public.pengurus set peran = null where peran is null;
alter table public.pengurus alter column peran set not null;
create index if not exists pengurus_peran_idx on public.pengurus (peran) where aktif;
-- Versi awal file ini memakai wilayah per blok; kini diganti gang/jalan
-- (dinonaktifkan oleh 07: wilayah_blok kini dipakai untuk pengurus per blok)
-- alter table public.pengurus drop column if exists wilayah_blok;

-- 1c. Pengumuman & kegiatan: untuk semua warga, satu blok, atau satu gang/jalan
alter table public.pengumuman add column if not exists blok text references public.blok(kode) on update cascade on delete set null;
alter table public.kegiatan add column if not exists blok text references public.blok(kode) on update cascade on delete set null;
alter table public.pengumuman add column if not exists gang_id uuid references public.gang(id) on delete set null;
alter table public.kegiatan add column if not exists gang_id uuid references public.gang(id) on delete set null;

-- Sasaran gang lebih sempit dari blok: bila gang dipilih, blok dikosongkan
create or replace function public._sasaran_rapikan() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.gang_id is not null then new.blok := null; end if;
  return new;
end $$;
drop trigger if exists pengumuman_sasaran on public.pengumuman;
create trigger pengumuman_sasaran before insert or update on public.pengumuman
  for each row execute function public._sasaran_rapikan();
drop trigger if exists kegiatan_sasaran on public.kegiatan;
create trigger kegiatan_sasaran before insert or update on public.kegiatan
  for each row execute function public._sasaran_rapikan();

-- 1d. Persetujuan pengeluaran kas
alter table public.pengaturan add column if not exists batas_persetujuan bigint not null default 1000000
  check (batas_persetujuan between 0 and 100000000000);
alter table public.transaksi_kas add column if not exists status text not null default 'disetujui';
alter table public.transaksi_kas add column if not exists disetujui_oleh uuid references public.warga(id) on delete set null;
alter table public.transaksi_kas add column if not exists disetujui_at timestamptz;
alter table public.transaksi_kas add column if not exists alasan_tolak text check (char_length(alasan_tolak) <= 300);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transaksi_kas_status_check') then
    alter table public.transaksi_kas add constraint transaksi_kas_status_check check (status in ('menunggu', 'disetujui', 'ditolak'));
  end if;
end $$;
create index if not exists kas_status_idx on public.transaksi_kas (status) where status <> 'disetujui';

-- 1e. Arsip administrasi (Sekretaris): surat masuk/keluar & notulen
create table if not exists public.dokumen (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('surat_masuk', 'surat_keluar', 'notulen', 'lainnya')),
  nomor text check (char_length(nomor) <= 60),
  judul text not null check (char_length(judul) between 3 and 160),
  tanggal date not null default current_date,
  pihak text check (char_length(pihak) <= 120),
  isi text check (char_length(isi) <= 20000),
  lampiran_path text check (char_length(lampiran_path) <= 300),
  publik boolean not null default false,
  dibuat_oleh uuid references public.warga(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dokumen_tanggal_idx on public.dokumen (tanggal desc);
drop trigger if exists dokumen_updated on public.dokumen;
create trigger dokumen_updated before update on public.dokumen for each row execute function public._set_updated_at();

-- 1f. Jenis notifikasi & aktivitas baru (menambah pilihan, tidak menghapus)
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'public.notifikasi'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ 'jenis';
  if c is not null then execute format('alter table public.notifikasi drop constraint %I', c); end if;
  alter table public.notifikasi add constraint notifikasi_jenis_check
    check (jenis in ('ipl', 'pengumuman', 'kegiatan', 'laporan', 'akun', 'umum', 'keuangan', 'administrasi'));
  select conname into c from pg_constraint where conrelid = 'public.aktivitas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ 'jenis';
  if c is not null then execute format('alter table public.aktivitas drop constraint %I', c); end if;
  alter table public.aktivitas add constraint aktivitas_jenis_check
    check (jenis in ('ipl', 'aspirasi', 'kegiatan', 'keuangan', 'pengumuman', 'anggota', 'administrasi'));
end $$;

-- ---------------------------------------------------------------------
-- 2. FUNGSI HAK AKSES
-- ---------------------------------------------------------------------

-- Pengguna aktif memiliki jabatan pengurus aktif dengan salah satu peran
create or replace function public.punya_peran(p_peran text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.pengurus p join public.warga w on w.id = p.warga_id
    where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
      and w.role in ('pengurus', 'admin') and p.peran = any (p_peran)
  )
$$;

create or replace function public.is_ketua() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.punya_peran(array['ketua'])
$$;

-- Pimpinan: Ketua & Wakil Ketua (pengawasan menyeluruh)
create or replace function public.is_pimpinan() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.punya_peran(array['ketua', 'wakil_ketua'])
$$;

create or replace function public.is_sekretaris() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.punya_peran(array['sekretaris'])
$$;

-- Bendahara: admin, bendahara, atau ketua (wakil ketua tidak lagi otomatis)
create or replace function public.is_bendahara() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.punya_peran(array['bendahara', 'ketua'])
$$;

-- Gang/jalan yang dipegang humas yang sedang masuk
create or replace function public.humas_gang() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct p.wilayah_gang), '{}')
  from public.pengurus p join public.warga w on w.id = p.warga_id
  where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
    and w.role in ('pengurus', 'admin') and p.peran = 'humas' and p.wilayah_gang is not null
$$;

-- Kelola anggota & informasi: pimpinan & sekretaris (semua), humas (gangnya saja).
-- p_gang null = data tanpa gang / untuk semua -> hanya pimpinan & sekretaris.
create or replace function public.bisa_kelola_gang(p_gang uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or public.punya_peran(array['ketua', 'wakil_ketua', 'sekretaris'])
      or (p_gang is not null and p_gang = any (public.humas_gang()))
$$;

-- Tangani aspirasi: pimpinan (semua) & humas (gangnya)
create or replace function public.bisa_tangani_aspirasi(p_gang uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_pimpinan() or (p_gang is not null and p_gang = any (public.humas_gang()))
$$;

-- Melihat seluruh catatan kas termasuk yang menunggu persetujuan
create or replace function public.bisa_lihat_kas_detail() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_bendahara() or public.is_pimpinan()
$$;

-- Administrasi (surat & notulen): sekretaris & pimpinan
create or replace function public.bisa_kelola_dokumen() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_pimpinan() or public.is_sekretaris()
$$;

create or replace function public.blok_warga(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select w.blok from public.warga w where w.id = p_id
$$;

create or replace function public.gang_warga(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select w.gang_id from public.warga w where w.id = p_id
$$;

-- Ringkasan hak untuk frontend (kunci lama tetap ada)
create or replace function public.hak_saya() returns jsonb
language sql stable security definer set search_path = '' as $$
  with p as (
    select coalesce(array_agg(distinct pp.peran) filter (where pp.peran is not null), '{}') as peran
    from public.pengurus pp join public.warga w on w.id = pp.warga_id
    where pp.warga_id = auth.uid() and pp.aktif and w.status = 'aktif' and w.role in ('pengurus', 'admin')
  )
  select jsonb_build_object(
    'aktif', public.is_aktif(),
    'pengurus', public.is_pengurus(),
    'admin', public.is_admin(),
    'bendahara', public.is_bendahara(),
    'ketua', public.is_ketua(),
    'pimpinan', public.is_pimpinan(),
    'sekretaris', public.is_sekretaris(),
    'humas', cardinality(public.humas_gang()) > 0,
    'wilayah', to_jsonb(public.humas_gang()),
    'peran', to_jsonb(p.peran),
    'kelola_anggota', public.bisa_kelola_gang(null),
    'kelola_info', public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0,
    'kelola_laporan', public.is_pimpinan() or cardinality(public.humas_gang()) > 0,
    'kelola_dokumen', public.bisa_kelola_dokumen(),
    'kelola_pengurus', public.is_ketua(),
    'setujui_kas', public.is_ketua(),
    'lihat_kas_detail', public.bisa_lihat_kas_detail()
  ) from p
$$;

-- ---------------------------------------------------------------------
-- 3. NOTIFIKASI TERARAH
-- ---------------------------------------------------------------------

-- Kirim ke admin + pengurus dengan peran tertentu (+ humas gang p_gang bila 'humas' disertakan)
drop function if exists public._notif_peran(text[], text, text, text, text, text);
create or replace function public._notif_peran(p_peran text[], p_gang uuid, p_judul text, p_isi text, p_jenis text, p_tautan text)
returns void language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(distinct w.id) into ids from public.warga w
  where w.status = 'aktif' and w.id is distinct from auth.uid()
    and (w.role = 'admin' or exists (
      select 1 from public.pengurus p where p.warga_id = w.id and p.aktif and w.role in ('pengurus', 'admin')
        and p.peran = any (p_peran)
        and (p.peran <> 'humas' or (p_gang is not null and p.wilayah_gang = p_gang))));
  if ids is not null then
    insert into public.notifikasi (warga_id, judul, isi, jenis, tautan)
    select unnest(ids), left(p_judul, 160), left(p_isi, 300), p_jenis, p_tautan;
  end if;
end $$;

-- Versi lama: tetap tersedia, kini memakai kolom peran
create or replace function public._notif_pengurus(p_judul text, p_isi text, p_jenis text, p_tautan text, p_hanya_bendahara boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_hanya_bendahara then
    perform public._notif_peran(array['bendahara', 'ketua'], null, p_judul, p_isi, p_jenis, p_tautan);
  else
    perform public._notif_peran(array['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'seksi'], null, p_judul, p_isi, p_jenis, p_tautan);
  end if;
end $$;

-- Pendaftar baru -> pimpinan, sekretaris, humas gangnya
create or replace function public._user_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_nama text; v_blok text; v_no text; v_hp text; v_gang uuid;
begin
  v_nama := left(btrim(coalesce(m ->> 'nama', m ->> 'full_name', m ->> 'name', '')), 80);
  if char_length(v_nama) < 2 then v_nama := 'Warga Baru'; end if;
  v_blok := upper(btrim(coalesce(m ->> 'blok', '')));
  if not exists (select 1 from public.blok b where b.kode = v_blok) then v_blok := null; end if;
  v_no := upper(nullif(btrim(coalesce(m ->> 'no_rumah', '')), ''));
  if not public.nomor_rumah_valid(v_no) then v_no := null; end if;
  v_hp := public.normalisasi_hp(m ->> 'nomor_hp');
  if coalesce(m ->> 'gang_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select g.id into v_gang from public.gang g
     where g.id = (m ->> 'gang_id')::uuid and (g.blok is null or g.blok = v_blok);
  end if;

  insert into public.warga (id, nama, blok, no_rumah, gang_id) values (new.id, v_nama, v_blok, v_no, v_gang)
  on conflict (id) do nothing;
  insert into public.warga_kontak (warga_id, nomor_hp, email)
  values (new.id, v_hp, case when v_provider = 'email' then null else new.email end)
  on conflict (warga_id) do nothing;

  if coalesce(current_setting('app.import', true), '') <> '1' then
    perform public._notif_peran(array['ketua', 'wakil_ketua', 'sekretaris', 'humas'], v_gang,
      'Pendaftaran anggota baru', v_nama || coalesce(' (' || public.label_alamat(v_blok, v_no, v_gang) || ')', '') || ' menunggu verifikasi', 'akun', '/admin/verifikasi');
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 4. TRIGGER YANG DIPERBARUI
-- ---------------------------------------------------------------------

-- 4a. Data warga: pengelola wilayah boleh merapikan data anggota (kecuali peran & admin)
create or replace function public._warga_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_bypass boolean := coalesce(current_setting('app.bypass', true), '') = '1';
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not v_bypass and not public.is_admin() then
    if old.id = auth.uid() then
      if new.role is distinct from old.role
         or new.status is distinct from old.status
         or new.alasan_status is distinct from old.alasan_status
         or new.rumah_id is distinct from old.rumah_id
         or new.kepala_keluarga is distinct from old.kepala_keluarga
         or new.bergabung_at is distinct from old.bergabung_at
         or new.disetujui_oleh is distinct from old.disetujui_oleh then
        raise exception 'Tidak diizinkan mengubah data ini' using errcode = '42501';
      end if;
      if old.status = 'aktif' and (new.blok is distinct from old.blok or new.no_rumah is distinct from old.no_rumah
                                   or new.gang_id is distinct from old.gang_id) then
        raise exception 'Perubahan alamat (blok, nomor rumah, gang) hanya oleh pengurus' using errcode = '42501';
      end if;
    else
      if not (public.bisa_kelola_gang(old.gang_id) and public.bisa_kelola_gang(new.gang_id)) then
        raise exception 'Data warga di luar kewenangan Anda' using errcode = '42501';
      end if;
      if old.role = 'admin' then raise exception 'Data admin hanya dapat diubah admin' using errcode = '42501'; end if;
      if new.role is distinct from old.role or new.disetujui_oleh is distinct from old.disetujui_oleh
         or new.bergabung_at is distinct from old.bergabung_at or new.wajib_ganti_pin is distinct from old.wajib_ganti_pin
         or new.pref_notifikasi is distinct from old.pref_notifikasi or new.foto_path is distinct from old.foto_path then
        raise exception 'Tidak diizinkan mengubah data ini' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'admin' and old.status = 'aktif'
     and (new.role <> 'admin' or new.status <> 'aktif')
     and not exists (select 1 from public.warga w where w.role = 'admin' and w.status = 'aktif' and w.id <> old.id) then
    raise exception 'Minimal harus ada satu admin aktif' using errcode = '42501';
  end if;

  if new.status = 'aktif' and new.blok is not null and new.no_rumah is not null
     and (tg_op = 'INSERT' or new.blok is distinct from old.blok or new.no_rumah is distinct from old.no_rumah
          or new.rumah_id is null or old.status <> 'aktif') then
    insert into public.rumah (blok, nomor) values (new.blok, upper(new.no_rumah)) on conflict (blok, nomor) do nothing;
    select r.id into new.rumah_id from public.rumah r where r.blok = new.blok and r.nomor = upper(new.no_rumah);
    update public.rumah set status = 'dihuni' where id = new.rumah_id and status <> 'dihuni';
  end if;
  return new;
end $$;

-- Nama sasaran untuk judul notifikasi: "Blok C" atau "Jl. Zamrud"
create or replace function public._nama_sasaran(p_blok text, p_gang uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select g.nama from public.gang g where g.id = p_gang), 'Blok ' || p_blok)
$$;

-- 4b. Pengumuman baru -> warga sasaran (semua, satu blok, atau satu gang)
create or replace function public._pengumuman_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[]; v_sasaran text := public._nama_sasaran(new.blok, new.gang_id);
begin
  select array_agg(id) into ids from public.warga
  where status = 'aktif' and id is distinct from new.dibuat_oleh
    and (new.blok is null or blok = new.blok) and (new.gang_id is null or gang_id = new.gang_id);
  if ids is not null then
    perform public._notif(ids, case when v_sasaran is null then 'Pengumuman baru: ' else 'Info ' || v_sasaran || ': ' end || new.judul,
      coalesce(new.ringkasan, left(new.isi, 120)), 'pengumuman', '/pengumuman/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'pengumuman', 'membuat pengumuman ' || new.judul, v_sasaran is null);
  return new;
end $$;

-- 4c. Kegiatan baru -> warga sasaran
create or replace function public._kegiatan_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[]; v_sasaran text := public._nama_sasaran(new.blok, new.gang_id);
begin
  select array_agg(id) into ids from public.warga
  where status = 'aktif' and id is distinct from new.dibuat_oleh
    and (new.blok is null or blok = new.blok) and (new.gang_id is null or gang_id = new.gang_id);
  if ids is not null then
    perform public._notif(ids, 'Kegiatan mendatang: ' || new.judul,
      to_char(new.mulai at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' · ' || new.lokasi
        || coalesce(' · khusus ' || v_sasaran, ''), 'kegiatan', '/kegiatan/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'kegiatan', 'menambahkan kegiatan ' || new.judul, v_sasaran is null);
  return new;
end $$;

-- 4d. Laporan: diteruskan ke pimpinan & humas gang pelapor
create or replace function public._laporan_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_nama text; v_alamat text; v_gang uuid;
begin
  if tg_op = 'INSERT' then
    select nama, public.label_alamat(blok, no_rumah, gang_id), gang_id into v_nama, v_alamat, v_gang
      from public.warga where id = new.pelapor_id;
    perform public._notif_peran(array['ketua', 'wakil_ketua', 'humas'], v_gang, 'Laporan baru: ' || new.judul,
      coalesce(v_nama, 'Warga') || coalesce(' (' || v_alamat || ')', '') || ' mengirim laporan', 'laporan', '/admin/laporan');
    perform public._aktivitas(new.pelapor_id, 'aspirasi', 'membuat laporan ' || new.judul, false);
  elsif new.status is distinct from old.status or new.tanggapan is distinct from old.tanggapan then
    perform public._notif(array[new.pelapor_id],
      case new.status when 'diproses' then 'Laporan Anda diproses'
                      when 'selesai' then 'Laporan Anda selesai ditangani'
                      when 'ditolak' then 'Laporan Anda tidak dapat ditindaklanjuti'
                      else 'Laporan Anda diperbarui' end,
      new.judul || coalesce(' · ' || new.tanggapan, ''), 'laporan', '/aspirasi');
  end if;
  return new;
end $$;

create or replace function public._laporan_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_kelola boolean := public.bisa_tangani_aspirasi(public.gang_warga(old.pelapor_id));
begin
  if auth.uid() is not null and not v_kelola then
    if new.status is distinct from old.status or new.tanggapan is distinct from old.tanggapan
       or new.ditangani_oleh is distinct from old.ditangani_oleh or new.pelapor_id is distinct from old.pelapor_id then
      raise exception 'Tidak diizinkan' using errcode = '42501';
    end if;
    if old.status <> 'baru' then raise exception 'Laporan yang sudah diproses tidak bisa diubah' using errcode = '42501'; end if;
  end if;
  if v_kelola and new.status is distinct from old.status then new.ditangani_oleh := auth.uid(); end if;
  if new.pelapor_id is distinct from old.pelapor_id then raise exception 'Pelapor tidak dapat diubah' using errcode = '42501'; end if;
  return new;
end $$;

-- 4e. Kas: pengeluaran >= batas perlu persetujuan Ketua
create or replace function public._kas_persetujuan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_batas bigint; v_perlu boolean; v_ketua boolean := public.is_ketua();
begin
  select batas_persetujuan into v_batas from public.pengaturan where id = 1;
  v_perlu := new.jenis = 'pengeluaran' and new.sumber = 'manual' and coalesce(v_batas, 0) > 0 and new.jumlah >= v_batas;

  if tg_op = 'INSERT' then
    if v_perlu and not v_ketua then
      new.status := 'menunggu'; new.disetujui_oleh := null; new.disetujui_at := null; new.alasan_tolak := null;
    else
      new.status := 'disetujui'; new.disetujui_oleh := auth.uid(); new.disetujui_at := now(); new.alasan_tolak := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if coalesce(current_setting('app.bypass', true), '') = '1' then return new; end if;
  if new.status is distinct from old.status or new.disetujui_oleh is distinct from old.disetujui_oleh
     or new.disetujui_at is distinct from old.disetujui_at or new.alasan_tolak is distinct from old.alasan_tolak then
    raise exception 'Status persetujuan hanya diubah lewat menu persetujuan Ketua' using errcode = '42501';
  end if;
  if (new.jenis, new.kategori, new.jumlah, new.tanggal) is distinct from (old.jenis, old.kategori, old.jumlah, old.tanggal) then
    if v_perlu and not v_ketua then
      new.status := 'menunggu'; new.disetujui_oleh := null; new.disetujui_at := null; new.alasan_tolak := null;
    else
      new.status := 'disetujui'; new.disetujui_oleh := auth.uid(); new.disetujui_at := now(); new.alasan_tolak := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists kas_persetujuan on public.transaksi_kas;
create trigger kas_persetujuan before insert or update on public.transaksi_kas
  for each row execute function public._kas_persetujuan();

create or replace function public._kas_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'menunggu' and (tg_op = 'INSERT' or old.status is distinct from 'menunggu') then
    perform public._notif_peran(array['ketua'], null, 'Persetujuan pengeluaran',
      new.kategori || ' · Rp ' || new.jumlah || coalesce(' · ' || new.keterangan, ''), 'keuangan', '/keuangan?tab=persetujuan');
  end if;
  return new;
end $$;

drop trigger if exists kas_notif on public.transaksi_kas;
create trigger kas_notif after insert or update on public.transaksi_kas
  for each row execute function public._kas_notif();

-- 4f. Dokumen: aktivitas & pemberitahuan notulen publik
create or replace function public._dokumen_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  if tg_op = 'INSERT' then
    perform public._aktivitas(new.dibuat_oleh, 'administrasi', 'mengarsipkan ' || replace(new.jenis, '_', ' ') || ' ' || new.judul, false);
  end if;
  if new.publik and (tg_op = 'INSERT' or not old.publik) then
    select array_agg(id) into ids from public.warga where status = 'aktif' and id is distinct from auth.uid();
    if ids is not null then
      perform public._notif(ids, 'Dokumen dibagikan: ' || new.judul, 'Dapat dibaca di menu Administrasi', 'administrasi', '/administrasi/' || new.id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists dokumen_notif on public.dokumen;
create trigger dokumen_notif after insert or update on public.dokumen
  for each row execute function public._dokumen_notif();

-- ---------------------------------------------------------------------
-- 5. FUNGSI RPC
-- ---------------------------------------------------------------------

create or replace function public.setujui_anggota(p_id uuid, p_kepala_keluarga boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.warga;
begin
  select * into w from public.warga where id = p_id;
  if not found then raise exception 'Warga tidak ditemukan'; end if;
  if not public.bisa_kelola_gang(w.gang_id) then raise exception 'Pendaftar ini di luar gang/jalan yang Anda pegang' using errcode = '42501'; end if;
  if w.blok is null or w.no_rumah is null then raise exception 'Blok dan nomor rumah belum diisi'; end if;
  perform set_config('app.bypass', '1', true);
  update public.warga
     set status = 'aktif', alasan_status = null, kepala_keluarga = coalesce(p_kepala_keluarga, false),
         bergabung_at = coalesce(bergabung_at, now()), disetujui_oleh = auth.uid()
   where id = p_id;
  perform set_config('app.bypass', '', true);
  perform public._notif(array[p_id], 'Selamat datang', 'Terima kasih telah bergabung. Akun Anda sudah aktif.', 'akun', '/');
  perform public._aktivitas(auth.uid(), 'anggota', 'menyetujui anggota ' || w.nama, false);
end $$;

create or replace function public.tolak_anggota(p_id uuid, p_alasan text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.warga;
begin
  select * into w from public.warga where id = p_id;
  if not found then raise exception 'Warga tidak ditemukan'; end if;
  if not public.bisa_kelola_gang(w.gang_id) then raise exception 'Pendaftar ini di luar gang/jalan yang Anda pegang' using errcode = '42501'; end if;
  if w.status = 'aktif' and w.role = 'admin' then raise exception 'Admin tidak bisa ditolak'; end if;
  perform set_config('app.bypass', '1', true);
  update public.warga set status = 'ditolak', alasan_status = left(nullif(btrim(p_alasan), ''), 300)
   where id = p_id and status = 'menunggu';
  perform set_config('app.bypass', '', true);
  perform public._aktivitas(auth.uid(), 'anggota', 'menolak pendaftaran ' || w.nama, false);
end $$;

-- Ketua menyetujui/menolak pengeluaran
create or replace function public.putuskan_pengeluaran(p_id uuid, p_setuju boolean, p_alasan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.transaksi_kas;
begin
  if not public.is_ketua() then raise exception 'Hanya Ketua yang dapat memberi persetujuan' using errcode = '42501'; end if;
  select * into t from public.transaksi_kas where id = p_id for update;
  if not found or t.status <> 'menunggu' then raise exception 'Pengeluaran tidak ditemukan atau sudah diputuskan'; end if;
  if not p_setuju and char_length(btrim(coalesce(p_alasan, ''))) < 3 then raise exception 'Isi alasan penolakan'; end if;
  perform set_config('app.bypass', '1', true);
  update public.transaksi_kas
     set status = case when p_setuju then 'disetujui' else 'ditolak' end,
         disetujui_oleh = auth.uid(), disetujui_at = now(),
         alasan_tolak = case when p_setuju then null else left(btrim(p_alasan), 300) end
   where id = p_id;
  perform set_config('app.bypass', '', true);
  perform public._notif_peran(array['bendahara'], null,
    case when p_setuju then 'Pengeluaran disetujui' else 'Pengeluaran ditolak' end,
    t.kategori || ' · Rp ' || t.jumlah || case when p_setuju then '' else ' · ' || btrim(p_alasan) end, 'keuangan', '/keuangan');
  perform public._aktivitas(auth.uid(), 'keuangan',
    case when p_setuju then 'menyetujui' else 'menolak' end || ' pengeluaran ' || t.kategori || ' Rp ' || t.jumlah, false);
end $$;

create or replace function public.statistik_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_periode date; r jsonb; v_wil uuid[] := public.humas_gang();
begin
  if not public.is_aktif() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select max(periode) into v_periode from public.tagihan_ipl where periode <= date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  if v_periode is null then select max(periode) into v_periode from public.tagihan_ipl; end if;
  select jsonb_build_object(
    'total_warga', (select count(*) from public.warga where status = 'aktif'),
    'kepala_keluarga', (select count(*) from public.warga where status = 'aktif' and kepala_keluarga),
    'pengurus_aktif', (select count(distinct p.warga_id) from public.pengurus p join public.warga w on w.id = p.warga_id where p.aktif and w.status = 'aktif'),
    'pengurus_total', (select count(distinct warga_id) from public.pengurus),
    'total_rumah', (select count(*) from public.rumah),
    'rumah_dihuni', (select count(*) from public.rumah where status = 'dihuni'),
    'periode_ipl', v_periode,
    'ipl_total_tagihan', (select coalesce(sum(nominal), 0) from public.tagihan_ipl where periode = v_periode),
    'ipl_lunas', (select count(*) from public.tagihan_ipl where periode = v_periode and status = 'lunas'),
    'ipl_belum', (select count(*) from public.tagihan_ipl where periode = v_periode and status <> 'lunas'),
    'saldo_kas', (select coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end), 0) from public.transaksi_kas where status = 'disetujui'),
    'anggota_menunggu', case when public.bisa_kelola_gang(null) or cardinality(v_wil) > 0 then
       (select count(*) from public.warga where status = 'menunggu' and public.bisa_kelola_gang(gang_id)) end,
    'pembayaran_menunggu', case when public.is_bendahara() then (select count(*) from public.pembayaran_ipl where status = 'menunggu') end,
    'laporan_baru', case when public.is_pimpinan() or cardinality(v_wil) > 0 then
       (select count(*) from public.laporan l where l.status in ('baru', 'diproses') and public.bisa_tangani_aspirasi(public.gang_warga(l.pelapor_id))) end,
    'pengeluaran_menunggu', case when public.bisa_lihat_kas_detail() then (select count(*) from public.transaksi_kas where status = 'menunggu') end,
    'pengeluaran_menunggu_nominal', case when public.bisa_lihat_kas_detail() then (select coalesce(sum(jumlah), 0) from public.transaksi_kas where status = 'menunggu') end,
    'dokumen_bulan_ini', case when public.bisa_kelola_dokumen() then
       (select count(*) from public.dokumen where date_trunc('month', tanggal) = date_trunc('month', now() at time zone 'Asia/Jakarta')) end,
    'wilayah', case when cardinality(v_wil) > 0 then (
       select jsonb_agg(jsonb_build_object(
         'gang', g.id, 'nama', g.nama, 'blok', g.blok,
         'warga', (select count(*) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'rumah', (select count(distinct w.rumah_id) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'menunggu', (select count(*) from public.warga w where w.status = 'menunggu' and w.gang_id = g.id),
         'laporan_aktif', (select count(*) from public.laporan l join public.warga w on w.id = l.pelapor_id where w.gang_id = g.id and l.status in ('baru', 'diproses')),
         'ipl_lunas', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status = 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id)),
         'ipl_belum', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status <> 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id))
       ) order by g.urutan, g.nama) from public.gang g where g.id = any (v_wil)) end
  ) into r;
  return r;
end $$;

create or replace function public.ringkasan_kas(p_bulan date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.is_aktif() then jsonb_build_object(
    'saldo', coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end) filter (where status = 'disetujui'), 0),
    'pemasukan_bulan', coalesce(sum(jumlah) filter (where status = 'disetujui' and jenis = 'pemasukan' and date_trunc('month', tanggal) = date_trunc('month', p_bulan)), 0),
    'pengeluaran_bulan', coalesce(sum(jumlah) filter (where status = 'disetujui' and jenis = 'pengeluaran' and date_trunc('month', tanggal) = date_trunc('month', p_bulan)), 0),
    'menunggu_jumlah', case when public.bisa_lihat_kas_detail() then count(*) filter (where status = 'menunggu') end,
    'menunggu_nominal', case when public.bisa_lihat_kas_detail() then coalesce(sum(jumlah) filter (where status = 'menunggu'), 0) end
  ) end
  from public.transaksi_kas
$$;

-- Ringkasan kas per bulan (12 bulan) untuk grafik
create or replace function public.arus_kas_bulanan(p_tahun integer)
returns table (bulan integer, pemasukan bigint, pengeluaran bigint) language sql stable security definer set search_path = '' as $$
  select m.bulan,
         coalesce(sum(t.jumlah) filter (where t.jenis = 'pemasukan'), 0)::bigint,
         coalesce(sum(t.jumlah) filter (where t.jenis = 'pengeluaran'), 0)::bigint
  from generate_series(1, 12) as m(bulan)
  left join public.transaksi_kas t
    on t.status = 'disetujui' and extract(year from t.tanggal) = p_tahun and extract(month from t.tanggal) = m.bulan
  where public.is_aktif()
  group by m.bulan order by m.bulan
$$;

-- Pengguna Google melengkapi data pendaftaran (kini dengan gang/jalan)
drop function if exists public.lengkapi_pendaftaran(text, text, text, text);
create or replace function public.lengkapi_pendaftaran(p_nama text, p_hp text, p_blok text, p_no_rumah text, p_gang uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp); v_no text := upper(btrim(coalesce(p_no_rumah, '')));
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if not exists (select 1 from public.warga where id = auth.uid() and status = 'menunggu') then
    raise exception 'Data hanya bisa dilengkapi saat menunggu persetujuan';
  end if;
  if char_length(btrim(coalesce(p_nama, ''))) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
  if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
  if not exists (select 1 from public.blok where kode = upper(p_blok)) then raise exception 'Blok tidak dikenal'; end if;
  if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid'; end if;
  if p_gang is not null and not exists (select 1 from public.gang g where g.id = p_gang and (g.blok is null or g.blok = upper(p_blok))) then
    raise exception 'Gang/jalan tidak ada di blok ini';
  end if;
  if exists (select 1 from public.warga_kontak where nomor_hp = v_hp and warga_id <> auth.uid()) then
    raise exception 'Nomor HP sudah terdaftar';
  end if;
  perform set_config('app.bypass', '1', true);
  update public.warga set nama = left(btrim(p_nama), 80), blok = upper(p_blok), no_rumah = v_no, gang_id = p_gang
  where id = auth.uid();
  update public.warga_kontak set nomor_hp = v_hp where warga_id = auth.uid();
  perform set_config('app.bypass', '', true);
end $$;

-- Import warga massal (menggantikan versi 04): kolom opsional "gang" berisi nama gang/jalan
-- p_rows: [{nama, hp, blok, no_rumah, gang?, pekerjaan?, kepala_keluarga?}]
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default '123456')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
  v_gang_teks text; v_gang uuid;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' then raise exception 'PIN awal harus 6 angka'; end if;

  perform set_config('app.import', '1', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
      v_hp := public.normalisasi_hp(r ->> 'hp');
      v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
      v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
      v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60);
      v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', r ->> 'jalan', '')), '');
      v_gang := null;

      if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
      if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok % tidak dikenal', v_blok; end if;
      if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid'; end if;
      if v_gang_teks is not null then
        select g.id into v_gang from public.gang g
         where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
         order by (g.blok is not null) desc limit 1;
        if v_gang is null then raise exception 'Gang/jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
      end if;

      v_email := v_hp || '@' || v_domain;
      if exists (select 1 from public.warga_kontak where nomor_hp = v_hp)
         or exists (select 1 from auth.users where lower(email) = v_email) then
        raise exception 'Nomor HP sudah terdaftar';
      end if;

      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', v_nama, 'nomor_hp', v_hp, 'blok', v_blok, 'no_rumah', v_no, 'gang_id', v_gang),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now());

      v_kk := case lower(coalesce(r ->> 'kepala_keluarga', ''))
                when 'ya' then true when 'y' then true when 'true' then true when '1' then true when 'kk' then true
                when 'tidak' then false when 'n' then false when 'false' then false when '0' then false
                else not exists (select 1 from public.warga w where w.blok = v_blok and w.no_rumah = v_no and w.kepala_keluarga)
              end;

      perform set_config('app.bypass', '1', true);
      update public.warga
         set status = 'aktif', kepala_keluarga = v_kk, pekerjaan = coalesce(v_kerja, pekerjaan),
             bergabung_at = now(), disetujui_oleh = auth.uid(), wajib_ganti_pin = true
       where id = v_id;
      perform set_config('app.bypass', '', true);

      v_dibuat := v_dibuat + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', coalesce(r ->> 'nama', ''), 'alasan', sqlerrm));
    end;
  end loop;

  perform set_config('app.import', '', true);
  if v_dibuat > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'mengimpor ' || v_dibuat || ' warga', false);
  end if;
  return jsonb_build_object('dibuat', v_dibuat, 'dilewati', v_skip);
end $$;

-- ---------------------------------------------------------------------
-- 6. HAK EKSEKUSI
-- ---------------------------------------------------------------------
revoke execute on function public._notif_peran(text[], uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public._gang_dari_teks(text) from public, anon, authenticated;
revoke execute on function public._nama_sasaran(text, uuid) from public, anon, authenticated;
revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;
grant execute on function public.lengkapi_pendaftaran(text, text, text, text, uuid) to authenticated;
grant execute on function public.nomor_rumah_valid(text) to anon, authenticated;
grant execute on function public.label_alamat(text, text, uuid) to authenticated;
revoke execute on function public._notif_pengurus(text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public._user_baru() from public, anon, authenticated;
revoke execute on function public._peran_dari_jabatan(text) from public, anon;
grant execute on function public.punya_peran(text[]) to authenticated;
grant execute on function public.is_ketua() to authenticated;
grant execute on function public.is_pimpinan() to authenticated;
grant execute on function public.is_sekretaris() to authenticated;
grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.humas_gang() to authenticated;
grant execute on function public.bisa_kelola_gang(uuid) to authenticated;
grant execute on function public.bisa_tangani_aspirasi(uuid) to authenticated;
grant execute on function public.gang_warga(uuid) to authenticated;
grant execute on function public.bisa_lihat_kas_detail() to authenticated;
grant execute on function public.bisa_kelola_dokumen() to authenticated;
grant execute on function public.blok_warga(uuid) to authenticated;
grant execute on function public.hak_saya() to authenticated;
grant execute on function public.setujui_anggota(uuid, boolean) to authenticated;
grant execute on function public.tolak_anggota(uuid, text) to authenticated;
grant execute on function public.putuskan_pengeluaran(uuid, boolean, text) to authenticated;
grant execute on function public.statistik_dashboard() to authenticated;
grant execute on function public.ringkasan_kas(date) to authenticated;
grant execute on function public.arus_kas_bulanan(integer) to authenticated;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (diganti per kewenangan)
-- ---------------------------------------------------------------------

-- gang/jalan: daftar terbuka (dipakai formulir pendaftaran); dikelola pimpinan & sekretaris
alter table public.gang enable row level security;
revoke insert, update, delete on public.gang from anon;
grant select on public.gang to anon, authenticated;
grant insert, update, delete on public.gang to authenticated;
drop policy if exists gang_baca on public.gang;
create policy gang_baca on public.gang for select to anon, authenticated using (true);
drop policy if exists gang_tambah on public.gang;
create policy gang_tambah on public.gang for insert to authenticated with check (public.bisa_kelola_gang(null));
drop policy if exists gang_ubah on public.gang;
create policy gang_ubah on public.gang for update to authenticated
  using (public.bisa_kelola_gang(null)) with check (public.bisa_kelola_gang(null));
drop policy if exists gang_hapus on public.gang;
create policy gang_hapus on public.gang for delete to authenticated using (public.bisa_kelola_gang(null));

-- warga: anggota aktif saling melihat; pendaftar hanya oleh pengelola gangnya
drop policy if exists warga_baca on public.warga;
create policy warga_baca on public.warga for select to authenticated
  using (id = auth.uid() or (status = 'aktif' and public.is_aktif()) or public.bisa_kelola_gang(gang_id));
drop policy if exists warga_ubah_pengelola on public.warga;
create policy warga_ubah_pengelola on public.warga for update to authenticated
  using (id <> auth.uid() and public.bisa_kelola_gang(gang_id))
  with check (id <> auth.uid() and public.bisa_kelola_gang(gang_id));

-- kontak: pemilik, pengelola gang, bendahara (penagihan)
drop policy if exists kontak_baca on public.warga_kontak;
create policy kontak_baca on public.warga_kontak for select to authenticated
  using (warga_id = auth.uid() or public.is_bendahara() or public.bisa_kelola_gang(public.gang_warga(warga_id)));

-- pengurus: dikelola admin & ketua
drop policy if exists pengurus_kelola on public.pengurus;
create policy pengurus_kelola on public.pengurus for all to authenticated
  using (public.is_ketua()) with check (public.is_ketua());

-- pengumuman & kegiatan: sasaran semua warga, satu blok, atau satu gang/jalan.
-- Humas hanya boleh menulis untuk gangnya; blok/semua warga oleh pimpinan & sekretaris.
drop policy if exists pengumuman_baca on public.pengumuman;
create policy pengumuman_baca on public.pengumuman for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_gang(gang_id)));
drop policy if exists pengumuman_kelola on public.pengumuman;
create policy pengumuman_kelola on public.pengumuman for all to authenticated
  using (public.bisa_kelola_gang(gang_id)) with check (public.bisa_kelola_gang(gang_id));

drop policy if exists kegiatan_baca on public.kegiatan;
create policy kegiatan_baca on public.kegiatan for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_gang(gang_id)));
drop policy if exists kegiatan_kelola on public.kegiatan;
create policy kegiatan_kelola on public.kegiatan for all to authenticated
  using (public.bisa_kelola_gang(gang_id)) with check (public.bisa_kelola_gang(gang_id));
drop policy if exists peserta_batal on public.kegiatan_peserta;
create policy peserta_batal on public.kegiatan_peserta for delete to authenticated
  using (warga_id = auth.uid() or exists (select 1 from public.kegiatan k where k.id = kegiatan_id and public.bisa_kelola_gang(k.gang_id)));

-- laporan: pelapor, pimpinan, humas gang pelapor
drop policy if exists laporan_baca on public.laporan;
create policy laporan_baca on public.laporan for select to authenticated
  using (pelapor_id = auth.uid() or public.bisa_tangani_aspirasi(public.gang_warga(pelapor_id)));
drop policy if exists laporan_ubah on public.laporan;
create policy laporan_ubah on public.laporan for update to authenticated
  using (pelapor_id = auth.uid() or public.bisa_tangani_aspirasi(public.gang_warga(pelapor_id)))
  with check (pelapor_id = auth.uid() or public.bisa_tangani_aspirasi(public.gang_warga(pelapor_id)));
drop policy if exists laporan_hapus on public.laporan;
create policy laporan_hapus on public.laporan for delete to authenticated
  using ((pelapor_id = auth.uid() and status = 'baru') or public.is_pimpinan());

-- kas: warga melihat yang sudah disetujui; bendahara & pimpinan melihat semua
drop policy if exists kas_baca on public.transaksi_kas;
create policy kas_baca on public.transaksi_kas for select to authenticated
  using (public.is_aktif() and (status = 'disetujui' or public.bisa_lihat_kas_detail()));

-- dokumen administrasi
alter table public.dokumen enable row level security;
revoke all on public.dokumen from anon;
grant select, insert, update, delete on public.dokumen to authenticated;
drop policy if exists dokumen_baca on public.dokumen;
create policy dokumen_baca on public.dokumen for select to authenticated
  using (public.is_pengurus() or (publik and public.is_aktif()));
drop policy if exists dokumen_kelola on public.dokumen;
create policy dokumen_kelola on public.dokumen for all to authenticated
  using (public.bisa_kelola_dokumen()) with check (public.bisa_kelola_dokumen());

-- Penyimpanan: gambar pengumuman/kegiatan oleh pengelola informasi;
-- foto laporan oleh pengelola laporan; lampiran dokumen di bucket 'bukti/dokumen'
drop policy if exists "pw konten baca" on storage.objects;
create policy "pw konten baca" on storage.objects for select to authenticated
  using (bucket_id = 'konten' and public.is_aktif() and (
    (storage.foldername(name))[1] in ('avatar', 'pengumuman', 'kegiatan')
    or ((storage.foldername(name))[1] = 'laporan' and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (select 1 from public.warga w where w.id::text = (storage.foldername(name))[2] and public.bisa_tangani_aspirasi(w.gang_id))))
  ));
drop policy if exists "pw konten tulis" on storage.objects;
create policy "pw konten tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'konten' and (
    ((storage.foldername(name))[1] = 'avatar' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'laporan' and (storage.foldername(name))[2] = auth.uid()::text and public.is_aktif())
    or ((storage.foldername(name))[1] in ('pengumuman', 'kegiatan') and (public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0))
  ));
drop policy if exists "pw dokumen baca" on storage.objects;
create policy "pw dokumen baca" on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and (storage.foldername(name))[1] = 'dokumen' and (
    public.is_pengurus() or exists (select 1 from public.dokumen d where d.lampiran_path = name and d.publik and public.is_aktif())));
drop policy if exists "pw dokumen tulis" on storage.objects;
create policy "pw dokumen tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti' and (storage.foldername(name))[1] = 'dokumen' and public.bisa_kelola_dokumen());
drop policy if exists "pw dokumen hapus" on storage.objects;
create policy "pw dokumen hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'bukti' and (storage.foldername(name))[1] = 'dokumen' and public.bisa_kelola_dokumen());

-- ---------------------------------------------------------------------
-- 8. BERSIH-BERSIH: fungsi versi awal (wilayah per blok) tidak dipakai lagi
-- ---------------------------------------------------------------------
drop function if exists public.bisa_kelola_wilayah(text);
drop function if exists public.bisa_kelola_laporan(text);
drop function if exists public.humas_blok();

-- #####################################################################
-- ##  BERKAS: 06-nama-perumahan.sql
-- #####################################################################
-- =====================================================================
-- 06 - Nama & alamat perumahan
-- Untuk database yang sudah berjalan. Aman dijalankan berulang.
-- RT/RW, tarif, rekening, dan pengaturan lain tidak disentuh.
-- (Instalasi baru sudah memakai nilai ini lewat 01 dan 02.)
-- =====================================================================
update public.pengaturan set
  nama_lingkungan = 'Perumahan Vila Gading Royal',
  alamat          = 'Desa Pamegarsari, Kec. Parung, Kab. Bogor'
where id = 1;

-- #####################################################################
-- ##  BERKAS: 07-update-sensus-blok-ipl.sql
-- #####################################################################
-- =====================================================================
-- 07-update-sensus-blok-ipl.sql
-- Jalankan SETELAH 01 s.d. 06. Aman dijalankan ulang, tidak menghapus data.
--
-- Isi pembaruan:
--  1. Data sensus warga: status pernikahan + jumlah anak (di warga_kontak, data pribadi)
--  2. Foto profil boleh berupa tautan (https) selain unggahan
--  3. Pengurus per blok (kolom pengurus.wilayah_blok):
--       - IPL (tagihan, bukti transfer, rincian di kas, statistik) hanya terlihat
--         oleh pengurus blok yang bersangkutan
--       - Pengumuman & kegiatan: pengurus blok hanya dapat menulis untuk bloknya
--     wilayah_blok kosong = pengurus semua blok (perilaku lama, tidak berubah).
--  4. Import warga: kolom opsional status_pernikahan, jumlah_anak, foto
--
-- Catatan: bila 05 pernah dijalankan ulang, jalankan 07 lagi sesudahnya.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SENSUS & FOTO
-- ---------------------------------------------------------------------
-- Data sensus disimpan di warga_kontak (data pribadi): hanya pemilik, bendahara,
-- dan pengurus yang berwenang atas warga tersebut yang dapat membacanya.
alter table public.warga_kontak add column if not exists status_pernikahan text;
alter table public.warga_kontak add column if not exists jumlah_anak smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kontak_status_pernikahan_check') then
    alter table public.warga_kontak add constraint kontak_status_pernikahan_check
      check (status_pernikahan is null or status_pernikahan in ('belum_menikah', 'menikah', 'cerai_hidup', 'cerai_mati'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kontak_jumlah_anak_check') then
    alter table public.warga_kontak add constraint kontak_jumlah_anak_check
      check (jumlah_anak is null or jumlah_anak between 0 and 30);
  end if;
end $$;

-- Jumlah anak hanya relevan bila sudah/pernah menikah
create or replace function public._kontak_sensus() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status_pernikahan is null or new.status_pernikahan = 'belum_menikah' then
    new.jumlah_anak := null;
  end if;
  return new;
end $$;
drop trigger if exists kontak_sensus on public.warga_kontak;
create trigger kontak_sensus before insert or update on public.warga_kontak
  for each row execute function public._kontak_sensus();

-- Nomor HP tetap hanya diubah admin. Pengurus berwenang boleh melengkapi data sensus
-- warga di wilayahnya, tetapi tidak email atau pengaturan tampil milik warga lain.
create or replace function public._kontak_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.bypass', true), '') <> '1' and not public.is_admin() then
    if new.nomor_hp is distinct from old.nomor_hp then
      raise exception 'Nomor HP dipakai untuk login dan hanya bisa diubah admin' using errcode = '42501';
    end if;
    if old.warga_id <> auth.uid() and (new.email is distinct from old.email
        or new.tampilkan_hp is distinct from old.tampilkan_hp or new.tampilkan_email is distinct from old.tampilkan_email) then
      raise exception 'Hanya data sensus warga yang dapat diubah pengurus' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop policy if exists kontak_ubah on public.warga_kontak;
create policy kontak_ubah on public.warga_kontak for update to authenticated
  using (warga_id = auth.uid() or public.is_admin() or public.bisa_kelola_gang(public.gang_warga(warga_id)))
  with check (warga_id = auth.uid() or public.is_admin() or public.bisa_kelola_gang(public.gang_warga(warga_id)));

-- Foto profil: path storage atau tautan https (batas panjang dinaikkan menjadi 500)
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.warga'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%foto_path%' loop
    execute format('alter table public.warga drop constraint %I', c.conname);
  end loop;
  alter table public.warga add constraint warga_foto_path_check check (char_length(foto_path) <= 500);
end $$;

-- Tautan foto harus https
create or replace function public._warga_foto() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.foto_path ~* '^https?:' and new.foto_path !~* '^https://[^[:space:]]+$' then
    raise exception 'Tautan foto harus diawali https://';
  end if;
  return new;
end $$;
drop trigger if exists warga_sensus on public.warga;
drop function if exists public._warga_sensus();
drop trigger if exists warga_foto on public.warga;
create trigger warga_foto before insert or update on public.warga
  for each row execute function public._warga_foto();

-- ---------------------------------------------------------------------
-- 2. PENGURUS PER BLOK
-- ---------------------------------------------------------------------
-- Tanpa "on delete set null": blok yang masih punya pengurus tidak bisa dihapus,
-- agar pengurus blok tidak tiba-tiba menjadi pengurus semua blok.
alter table public.pengurus add column if not exists wilayah_blok text references public.blok(kode) on update cascade;

create or replace function public._pengurus_isi_peran() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.peran is null then new.peran := public._peran_dari_jabatan(new.jabatan); end if;
  if new.peran = 'humas' and new.wilayah_gang is null then
    new.wilayah_gang := public._gang_dari_teks(new.jabatan);
  end if;
  if new.peran <> 'humas' then new.wilayah_gang := null; end if;
  -- wilayah blok hanya untuk peran inti (Ketua, Wakil, Sekretaris, Bendahara)
  if new.peran not in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara') then new.wilayah_blok := null; end if;
  return new;
end $$;

-- Daftar blok yang boleh dikelola pengguna untuk peran tertentu.
-- Berisi '*' bila semua blok (admin, atau pengurus tanpa wilayah blok).
create or replace function public.wilayah_blok_peran(p_peran text[]) returns text[]
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then array['*']
    else coalesce((
      select array_agg(distinct coalesce(p.wilayah_blok, '*'))
      from public.pengurus p join public.warga w on w.id = p.warga_id
      where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
        and w.role in ('pengurus', 'admin') and p.peran = any (p_peran)
    ), '{}'::text[]) end
$$;

-- Boleh melihat/mengelola IPL di blok ini? (admin, bendahara, ketua - sesuai wilayahnya)
create or replace function public.ipl_blok_boleh(p_blok text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce('*' = any (x.w) or (p_blok is not null and p_blok = any (x.w)), false)
  from (select public.wilayah_blok_peran(array['bendahara', 'ketua']) as w) x
$$;

-- Ketua tanpa wilayah blok (atau admin): boleh mengatur seluruh pengurus
create or replace function public.is_ketua_utama() returns boolean
language sql stable security definer set search_path = '' as $$
  select '*' = any (public.wilayah_blok_peran(array['ketua']))
$$;

-- Boleh menulis pengumuman/kegiatan untuk sasaran (blok / gang) ini?
-- Humas: gangnya. Ketua/Wakil/Sekretaris: seluruh blok, atau hanya blok wilayahnya.
create or replace function public.bisa_kelola_info(p_blok text, p_gang uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (p_gang is not null and p_gang = any (public.humas_gang()))
      or exists (
        select 1 from unnest(public.wilayah_blok_peran(array['ketua', 'wakil_ketua', 'sekretaris'])) b
        where b = '*' or b = coalesce(p_blok, (select g.blok from public.gang g where g.id = p_gang)))
$$;

create or replace function public.blok_rumah(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select r.blok from public.rumah r where r.id = p_id
$$;
create or replace function public.blok_tagihan(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select r.blok from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.id = p_id
$$;
create or replace function public.rumah_tagihan(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select t.rumah_id from public.tagihan_ipl t where t.id = p_id
$$;

-- ---------------------------------------------------------------------
-- 3. HAK AKSES UNTUK FRONTEND (menambah ipl_blok & info_blok)
-- ---------------------------------------------------------------------
create or replace function public.hak_saya() returns jsonb
language sql stable security definer set search_path = '' as $$
  with p as (
    select coalesce(array_agg(distinct pp.peran) filter (where pp.peran is not null), '{}') as peran
    from public.pengurus pp join public.warga w on w.id = pp.warga_id
    where pp.warga_id = auth.uid() and pp.aktif and w.status = 'aktif' and w.role in ('pengurus', 'admin')
  )
  select jsonb_build_object(
    'aktif', public.is_aktif(),
    'pengurus', public.is_pengurus(),
    'admin', public.is_admin(),
    'bendahara', public.is_bendahara(),
    'ketua', public.is_ketua(),
    'pimpinan', public.is_pimpinan(),
    'sekretaris', public.is_sekretaris(),
    'humas', cardinality(public.humas_gang()) > 0,
    'wilayah', to_jsonb(public.humas_gang()),
    'peran', to_jsonb(p.peran),
    'kelola_anggota', public.bisa_kelola_gang(null),
    'kelola_info', public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0,
    'kelola_laporan', public.is_pimpinan() or cardinality(public.humas_gang()) > 0,
    'kelola_dokumen', public.bisa_kelola_dokumen(),
    'kelola_pengurus', public.is_ketua_utama(),
    'setujui_kas', public.is_ketua(),
    'lihat_kas_detail', public.bisa_lihat_kas_detail(),
    -- wilayah blok pengurus: ['*'] = semua blok, atau daftar kode blok
    'ipl_blok', to_jsonb(public.wilayah_blok_peran(array['bendahara', 'ketua'])),
    'info_blok', to_jsonb(public.wilayah_blok_peran(array['ketua', 'wakil_ketua', 'sekretaris']))
  ) from p
$$;

-- ---------------------------------------------------------------------
-- 4. NOTIFIKASI: bisa dibatasi ke pengurus blok tertentu
-- ---------------------------------------------------------------------
drop function if exists public._notif_peran(text[], uuid, text, text, text, text);
create or replace function public._notif_peran(p_peran text[], p_gang uuid, p_judul text, p_isi text, p_jenis text, p_tautan text, p_blok text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(distinct w.id) into ids from public.warga w
  where w.status = 'aktif' and w.id is distinct from auth.uid()
    and (w.role = 'admin' or exists (
      select 1 from public.pengurus p where p.warga_id = w.id and p.aktif and w.role in ('pengurus', 'admin')
        and p.peran = any (p_peran)
        and (p.peran <> 'humas' or (p_gang is not null and p.wilayah_gang = p_gang))
        and (p_blok is null or p.peran = 'humas' or p.wilayah_blok is null or p.wilayah_blok = p_blok)));
  if ids is not null then
    insert into public.notifikasi (warga_id, judul, isi, jenis, tautan)
    select unnest(ids), left(p_judul, 160), left(p_isi, 300), p_jenis, p_tautan;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. IPL PER BLOK
-- ---------------------------------------------------------------------
-- Terbitkan tagihan hanya untuk blok yang menjadi kewenangan pengguna
create or replace function public.buat_tagihan_ipl(p_periode date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_periode date := date_trunc('month', p_periode)::date; v_jumlah integer; s public.pengaturan;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into s from public.pengaturan where id = 1;
  insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select r.id, v_periode, coalesce(r.tarif_ipl, s.tarif_ipl), v_periode + (s.jatuh_tempo_hari - 1)
  from public.rumah r where r.status = 'dihuni' and public.ipl_blok_boleh(r.blok)
  on conflict (rumah_id, periode) do nothing;
  get diagnostics v_jumlah = row_count;
  if v_jumlah > 0 then
    perform public._notif(
      (select array_agg(w.id) from public.warga w join public.tagihan_ipl t on t.rumah_id = w.rumah_id
        where t.periode = v_periode and w.status = 'aktif' and public.ipl_blok_boleh(w.blok)),
      'Tagihan IPL ' || public._nama_periode(v_periode), 'Tagihan IPL bulan ini sudah terbit', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'ipl', 'menerbitkan tagihan IPL ' || public._nama_periode(v_periode), false);
  end if;
  return v_jumlah;
end $$;

-- Bukti transfer: pemberitahuan hanya ke pengurus blok rumah tersebut
create or replace function public.kirim_pembayaran(p_tagihan uuid[], p_bukti_path text, p_catatan text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_rumah uuid := public.rumah_saya(); v_total integer; v_n integer; v_id uuid; v_nama text; v_blok text;
begin
  if v_rumah is null then raise exception 'Akun Anda belum terhubung ke rumah' using errcode = '42501'; end if;
  if coalesce(array_length(p_tagihan, 1), 0) = 0 then raise exception 'Pilih tagihan'; end if;
  if p_bukti_path is null or split_part(p_bukti_path, '/', 1) <> 'ipl' or split_part(p_bukti_path, '/', 2) <> auth.uid()::text then
    raise exception 'Bukti pembayaran tidak valid';
  end if;
  select count(*), sum(nominal) into v_n, v_total from public.tagihan_ipl
   where id = any (p_tagihan) and rumah_id = v_rumah and status = 'belum_bayar';
  if v_n <> array_length(p_tagihan, 1) then raise exception 'Ada tagihan yang tidak valid atau sudah dibayar'; end if;
  insert into public.pembayaran_ipl (warga_id, rumah_id, jumlah, bukti_path, catatan)
  values (auth.uid(), v_rumah, greatest(v_total, 1), p_bukti_path, left(p_catatan, 300)) returning id into v_id;
  update public.tagihan_ipl set status = 'menunggu_verifikasi', pembayaran_id = v_id where id = any (p_tagihan);
  select nama into v_nama from public.warga where id = auth.uid();
  v_blok := public.blok_rumah(v_rumah);
  perform public._notif_peran(array['bendahara', 'ketua'], null, 'Bukti pembayaran IPL baru',
    v_nama || ' mengunggah bukti pembayaran', 'ipl', '/admin/ipl', v_blok);
  perform public._aktivitas(auth.uid(), 'ipl', 'mengunggah bukti pembayaran IPL', false);
  return v_id;
end $$;

create or replace function public.verifikasi_pembayaran(p_id uuid, p_terima boolean, p_alasan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.pembayaran_ipl; t record; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into p from public.pembayaran_ipl where id = p_id for update;
  if not found or p.status <> 'menunggu' then raise exception 'Pembayaran tidak ditemukan atau sudah diverifikasi'; end if;
  if not public.ipl_blok_boleh(public.blok_rumah(p.rumah_id)) then
    raise exception 'IPL blok ini bukan kewenangan Anda' using errcode = '42501';
  end if;
  select kode into v_kode from public.rumah where id = p.rumah_id;
  if p_terima then
    update public.pembayaran_ipl set status = 'diterima', diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    for t in select * from public.tagihan_ipl where pembayaran_id = p_id loop
      update public.tagihan_ipl set status = 'lunas', dibayar_at = p.created_at, metode = 'transfer' where id = t.id;
      insert into public.transaksi_kas (jenis, kategori, jumlah, tanggal, keterangan, sumber, pembayaran_id, tagihan_id, bukti_path, dibuat_oleh)
      values ('pemasukan', 'Iuran IPL', t.nominal, (p.created_at at time zone 'Asia/Jakarta')::date,
              'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode, 'ipl', p_id, t.id, p.bukti_path, auth.uid())
      on conflict (tagihan_id) do nothing;
    end loop;
    perform public._notif(array[p.warga_id], 'Pembayaran IPL diverifikasi', 'Pembayaran Rp ' || p.jumlah || ' telah diterima', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'keuangan', 'menyetujui pembayaran IPL ' || v_kode, false);
  else
    update public.pembayaran_ipl set status = 'ditolak', alasan_tolak = left(nullif(btrim(p_alasan), ''), 300),
           diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    update public.tagihan_ipl set status = 'belum_bayar', pembayaran_id = null where pembayaran_id = p_id;
    perform public._notif(array[p.warga_id], 'Bukti pembayaran IPL ditolak', coalesce(p_alasan, 'Silakan unggah ulang bukti yang benar'), 'ipl', '/ipl');
  end if;
end $$;

create or replace function public.tandai_lunas_tunai(p_tagihan uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tagihan_ipl; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into t from public.tagihan_ipl where id = p_tagihan for update;
  if not found or t.status = 'lunas' then raise exception 'Tagihan tidak ditemukan atau sudah lunas'; end if;
  if not public.ipl_blok_boleh(public.blok_rumah(t.rumah_id)) then
    raise exception 'IPL blok ini bukan kewenangan Anda' using errcode = '42501';
  end if;
  if t.status = 'menunggu_verifikasi' then raise exception 'Tagihan ini sedang menunggu verifikasi bukti transfer'; end if;
  select kode into v_kode from public.rumah where id = t.rumah_id;
  update public.tagihan_ipl set status = 'lunas', dibayar_at = now(), metode = 'tunai' where id = t.id;
  if t.nominal > 0 then
    insert into public.transaksi_kas (jenis, kategori, jumlah, keterangan, sumber, tagihan_id, dibuat_oleh)
    values ('pemasukan', 'Iuran IPL', t.nominal, 'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode || ' (tunai)', 'ipl', t.id, auth.uid());
  end if;
  perform public._notif((select array_agg(id) from public.warga where rumah_id = t.rumah_id),
    'Pembayaran IPL tercatat', 'IPL ' || public._nama_periode(t.periode) || ' lunas (tunai)', 'ipl', '/ipl');
end $$;

-- Grafik IPL bulanan: hanya blok yang boleh dilihat pengguna
create or replace function public.statistik_ipl_bulanan(p_tahun integer)
returns table (bulan integer, lunas bigint, belum bigint) language sql stable security definer set search_path = '' as $$
  select m.bulan,
         count(t.id) filter (where t.status = 'lunas'),
         count(t.id) filter (where t.status <> 'lunas')
  from generate_series(1, 12) as m(bulan)
  left join (
    select t0.* from public.tagihan_ipl t0 join public.rumah r on r.id = t0.rumah_id where public.ipl_blok_boleh(r.blok)
  ) t on extract(year from t.periode) = p_tahun and extract(month from t.periode) = m.bulan
  where public.is_aktif()
  group by m.bulan order by m.bulan
$$;

-- Ringkasan dasbor (IPL dibatasi per blok)
create or replace function public.statistik_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_periode date; r jsonb; v_wil uuid[] := public.humas_gang();
begin
  if not public.is_aktif() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select max(periode) into v_periode from public.tagihan_ipl where periode <= date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  if v_periode is null then select max(periode) into v_periode from public.tagihan_ipl; end if;
  select jsonb_build_object(
    'total_warga', (select count(*) from public.warga where status = 'aktif'),
    'kepala_keluarga', (select count(*) from public.warga where status = 'aktif' and kepala_keluarga),
    'pengurus_aktif', (select count(distinct p.warga_id) from public.pengurus p join public.warga w on w.id = p.warga_id where p.aktif and w.status = 'aktif'),
    'pengurus_total', (select count(distinct warga_id) from public.pengurus),
    'total_rumah', (select count(*) from public.rumah),
    'rumah_dihuni', (select count(*) from public.rumah where status = 'dihuni'),
    'periode_ipl', v_periode,
    -- IPL: hanya blok yang boleh dilihat pengguna (pengurus blok masing-masing)
    'ipl_terlihat', cardinality(public.wilayah_blok_peran(array['bendahara', 'ketua'])) > 0,
    'ipl_total_tagihan', (select coalesce(sum(t.nominal), 0) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and public.ipl_blok_boleh(r.blok)),
    'ipl_lunas', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and t.status = 'lunas' and public.ipl_blok_boleh(r.blok)),
    'ipl_belum', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and t.status <> 'lunas' and public.ipl_blok_boleh(r.blok)),
    'saldo_kas', (select coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end), 0) from public.transaksi_kas where status = 'disetujui'),
    'anggota_menunggu', case when public.bisa_kelola_gang(null) or cardinality(v_wil) > 0 then
       (select count(*) from public.warga where status = 'menunggu' and public.bisa_kelola_gang(gang_id)) end,
    'pembayaran_menunggu', case when public.is_bendahara() then (select count(*) from public.pembayaran_ipl p join public.rumah r on r.id = p.rumah_id where p.status = 'menunggu' and public.ipl_blok_boleh(r.blok)) end,
    'laporan_baru', case when public.is_pimpinan() or cardinality(v_wil) > 0 then
       (select count(*) from public.laporan l where l.status in ('baru', 'diproses') and public.bisa_tangani_aspirasi(public.gang_warga(l.pelapor_id))) end,
    'pengeluaran_menunggu', case when public.bisa_lihat_kas_detail() then (select count(*) from public.transaksi_kas where status = 'menunggu') end,
    'pengeluaran_menunggu_nominal', case when public.bisa_lihat_kas_detail() then (select coalesce(sum(jumlah), 0) from public.transaksi_kas where status = 'menunggu') end,
    'dokumen_bulan_ini', case when public.bisa_kelola_dokumen() then
       (select count(*) from public.dokumen where date_trunc('month', tanggal) = date_trunc('month', now() at time zone 'Asia/Jakarta')) end,
    'wilayah', case when cardinality(v_wil) > 0 then (
       select jsonb_agg(jsonb_build_object(
         'gang', g.id, 'nama', g.nama, 'blok', g.blok,
         'warga', (select count(*) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'rumah', (select count(distinct w.rumah_id) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'menunggu', (select count(*) from public.warga w where w.status = 'menunggu' and w.gang_id = g.id),
         'laporan_aktif', (select count(*) from public.laporan l join public.warga w on w.id = l.pelapor_id where w.gang_id = g.id and l.status in ('baru', 'diproses')),
         'ipl_lunas', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status = 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id)),
         'ipl_belum', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status <> 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id))
       ) order by g.urutan, g.nama) from public.gang g where g.id = any (v_wil)) end
  ) into r;
  return r;
end $$;

-- Import warga: kolom opsional status_pernikahan, jumlah_anak, foto (tautan https)
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default '123456')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
  v_gang_teks text; v_gang uuid; v_nikah text; v_anak text; v_foto text;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' then raise exception 'PIN awal harus 6 angka'; end if;

  perform set_config('app.import', '1', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
      v_hp := public.normalisasi_hp(r ->> 'hp');
      v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
      v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
      v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60);
      v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', r ->> 'jalan', '')), '');
      v_gang := null;
      v_nikah := case lower(btrim(coalesce(r ->> 'status_pernikahan', '')))
        when '' then null
        when 'belum_menikah' then 'belum_menikah' when 'belum menikah' then 'belum_menikah' when 'lajang' then 'belum_menikah' when 'belum kawin' then 'belum_menikah'
        when 'menikah' then 'menikah' when 'sudah menikah' then 'menikah' when 'kawin' then 'menikah'
        when 'cerai_hidup' then 'cerai_hidup' when 'cerai hidup' then 'cerai_hidup'
        when 'cerai_mati' then 'cerai_mati' when 'cerai mati' then 'cerai_mati'
        else 'x' end;
      if v_nikah = 'x' then raise exception 'Status pernikahan "%" tidak dikenal', r ->> 'status_pernikahan'; end if;
      v_anak := nullif(btrim(coalesce(r ->> 'jumlah_anak', '')), '');
      if v_anak is not null and v_anak !~ '^[0-9]{1,2}$' then raise exception 'Jumlah anak harus angka 0-30'; end if;
      if v_anak is not null and v_anak::integer > 30 then raise exception 'Jumlah anak harus angka 0-30'; end if;
      v_foto := nullif(btrim(coalesce(r ->> 'foto', '')), '');
      if v_foto is not null and (v_foto !~* '^https://[^[:space:]]+$' or char_length(v_foto) > 480) then raise exception 'Tautan foto harus diawali https://'; end if;

      if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
      if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok % tidak dikenal', v_blok; end if;
      if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid'; end if;
      if v_gang_teks is not null then
        select g.id into v_gang from public.gang g
         where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
         order by (g.blok is not null) desc limit 1;
        if v_gang is null then raise exception 'Gang/jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
      end if;

      v_email := v_hp || '@' || v_domain;
      if exists (select 1 from public.warga_kontak where nomor_hp = v_hp)
         or exists (select 1 from auth.users where lower(email) = v_email) then
        raise exception 'Nomor HP sudah terdaftar';
      end if;

      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', v_nama, 'nomor_hp', v_hp, 'blok', v_blok, 'no_rumah', v_no, 'gang_id', v_gang),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now());

      v_kk := case lower(coalesce(r ->> 'kepala_keluarga', ''))
                when 'ya' then true when 'y' then true when 'true' then true when '1' then true when 'kk' then true
                when 'tidak' then false when 'n' then false when 'false' then false when '0' then false
                else not exists (select 1 from public.warga w where w.blok = v_blok and w.no_rumah = v_no and w.kepala_keluarga)
              end;

      perform set_config('app.bypass', '1', true);
      update public.warga
         set status = 'aktif', kepala_keluarga = v_kk, pekerjaan = coalesce(v_kerja, pekerjaan),
             foto_path = v_foto,
             bergabung_at = now(), disetujui_oleh = auth.uid(), wajib_ganti_pin = true
       where id = v_id;
      update public.warga_kontak set status_pernikahan = v_nikah, jumlah_anak = v_anak::smallint where warga_id = v_id;
      perform set_config('app.bypass', '', true);

      v_dibuat := v_dibuat + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', coalesce(r ->> 'nama', ''), 'alasan', sqlerrm));
    end;
  end loop;

  perform set_config('app.import', '', true);
  if v_dibuat > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'mengimpor ' || v_dibuat || ' warga', false);
  end if;
  return jsonb_build_object('dibuat', v_dibuat, 'dilewati', v_skip);
end $$;

-- ---------------------------------------------------------------------
-- 6. KEBIJAKAN AKSES (RLS)
-- ---------------------------------------------------------------------
-- Rumah, tagihan, dan pembayaran IPL: pengurus blok masing-masing
drop policy if exists rumah_kelola on public.rumah;
create policy rumah_kelola on public.rumah for all to authenticated
  using (public.ipl_blok_boleh(blok)) with check (public.ipl_blok_boleh(blok));

drop policy if exists tagihan_baca on public.tagihan_ipl;
create policy tagihan_baca on public.tagihan_ipl for select to authenticated
  using (rumah_id = public.rumah_saya() or public.ipl_blok_boleh(public.blok_rumah(rumah_id)));
drop policy if exists tagihan_kelola on public.tagihan_ipl;
create policy tagihan_kelola on public.tagihan_ipl for all to authenticated
  using (public.ipl_blok_boleh(public.blok_rumah(rumah_id))) with check (public.ipl_blok_boleh(public.blok_rumah(rumah_id)));
drop policy if exists pembayaran_baca on public.pembayaran_ipl;
create policy pembayaran_baca on public.pembayaran_ipl for select to authenticated
  using (warga_id = auth.uid() or rumah_id = public.rumah_saya() or public.ipl_blok_boleh(public.blok_rumah(rumah_id)));

-- Kas: catatan IPL per rumah hanya untuk pemilik rumah & pengurus blok itu.
-- Saldo dan ringkasan kas tetap terbuka untuk semua warga (fungsi ringkasan_kas).
drop policy if exists kas_baca on public.transaksi_kas;
create policy kas_baca on public.transaksi_kas for select to authenticated
  using (public.is_aktif()
    and (status = 'disetujui' or public.bisa_lihat_kas_detail())
    and (sumber <> 'ipl'
         or public.ipl_blok_boleh(public.blok_tagihan(tagihan_id))
         or (tagihan_id is not null and public.rumah_tagihan(tagihan_id) = public.rumah_saya())));

-- Bukti transfer IPL: pemilik atau pengurus blok warga tersebut
drop policy if exists "pw bukti baca" on storage.objects;
create policy "pw bukti baca" on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'ipl' and exists (
          select 1 from public.warga w
          where w.id::text = (storage.foldername(name))[2] and public.ipl_blok_boleh(w.blok)))
    or ((storage.foldername(name))[1] = 'kas' and public.is_aktif())
    or ((storage.foldername(name))[1] not in ('ipl', 'kas') and public.is_bendahara())));

-- Pengumuman & kegiatan: sasaran semua warga / satu blok / satu jalan.
-- Pengurus berwilayah blok hanya boleh menulis untuk bloknya.
drop policy if exists pengumuman_baca on public.pengumuman;
create policy pengumuman_baca on public.pengumuman for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_info(blok, gang_id)));
drop policy if exists pengumuman_kelola on public.pengumuman;
create policy pengumuman_kelola on public.pengumuman for all to authenticated
  using (public.bisa_kelola_info(blok, gang_id)) with check (public.bisa_kelola_info(blok, gang_id));

drop policy if exists kegiatan_baca on public.kegiatan;
create policy kegiatan_baca on public.kegiatan for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_info(blok, gang_id)));
drop policy if exists kegiatan_kelola on public.kegiatan;
create policy kegiatan_kelola on public.kegiatan for all to authenticated
  using (public.bisa_kelola_info(blok, gang_id)) with check (public.bisa_kelola_info(blok, gang_id));

-- Susunan pengurus: admin & Ketua tanpa wilayah blok (agar Ketua blok tidak bisa
-- mengangkat dirinya atau orang lain menjadi pengurus semua blok)
drop policy if exists pengurus_kelola on public.pengurus;
create policy pengurus_kelola on public.pengurus for all to authenticated
  using (public.is_ketua_utama()) with check (public.is_ketua_utama());

-- ---------------------------------------------------------------------
-- 7. HAK EKSEKUSI
-- ---------------------------------------------------------------------
revoke execute on function public._notif_peran(text[], uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.wilayah_blok_peran(text[]) from public, anon;
revoke execute on function public.ipl_blok_boleh(text) from public, anon;
revoke execute on function public.is_ketua_utama() from public, anon;
revoke execute on function public.bisa_kelola_info(text, uuid) from public, anon;
revoke execute on function public.blok_rumah(uuid) from public, anon;
revoke execute on function public.blok_tagihan(uuid) from public, anon;
revoke execute on function public.rumah_tagihan(uuid) from public, anon;
grant execute on function public.wilayah_blok_peran(text[]) to authenticated;
grant execute on function public.ipl_blok_boleh(text) to authenticated;
grant execute on function public.is_ketua_utama() to authenticated;
grant execute on function public.bisa_kelola_info(text, uuid) to authenticated;
grant execute on function public.blok_rumah(uuid) to authenticated;
grant execute on function public.blok_tagihan(uuid) to authenticated;
grant execute on function public.rumah_tagihan(uuid) to authenticated;
grant execute on function public.buat_tagihan_ipl(date) to authenticated;
grant execute on function public.kirim_pembayaran(uuid[], text, text) to authenticated;
grant execute on function public.verifikasi_pembayaran(uuid, boolean, text) to authenticated;
grant execute on function public.tandai_lunas_tunai(uuid) to authenticated;
grant execute on function public.statistik_dashboard() to authenticated;
grant execute on function public.statistik_ipl_bulanan(integer) to authenticated;
grant execute on function public.hak_saya() to authenticated;
revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;

-- #####################################################################
-- ##  BERKAS: 08-perbaikan-prioritas.sql
-- #####################################################################
-- =====================================================================
-- 08 — Perbaikan prioritas: daftar periode IPL, total transaksi, dan LOG AUDIT kas
-- Jalankan di Supabase > SQL Editor SETELAH 07-update-sensus-blok-ipl.sql. Aman dijalankan ulang.
--
-- Isi:
--   1. periode_ipl_tersedia()   daftar periode IPL langsung dari database (bukan 5000 baris ke peramban)
--   2. ringkasan_transaksi()    jumlah baris + total masuk/keluar sesuai filter, tidak terpotong paginasi
--   3. audit_log + trigger      semua perubahan transaksi kas (tambah/ubah/hapus) dan penghapusan tagihan IPL
--   4. pulihkan_transaksi()     mengembalikan transaksi kas manual yang terhapus (tetap lewat aturan persetujuan Ketua)
--   5. tanggal bawaan kas & dokumen memakai zona Asia/Jakarta (bukan UTC)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Periode IPL yang tersedia (security invoker: RLS pemanggil tetap berlaku)
-- ---------------------------------------------------------------------
create or replace function public.periode_ipl_tersedia()
returns setof date language sql stable security invoker set search_path = '' as $$
  select distinct t.periode from public.tagihan_ipl t order by t.periode desc
$$;

-- ---------------------------------------------------------------------
-- 2. Ringkasan transaksi sesuai filter (security invoker: hanya baris yang boleh dilihat pemanggil)
--    jumlah     = banyak baris yang cocok (semua status, sama dengan daftar di layar)
--    pemasukan / pengeluaran = total yang sudah DISETUJUI saja
-- ---------------------------------------------------------------------
create or replace function public.ringkasan_transaksi(p_jenis text default null, p_dari date default null, p_sampai date default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'jumlah', count(*),
    'pemasukan', coalesce(sum(t.jumlah) filter (where t.jenis = 'pemasukan' and t.status = 'disetujui'), 0),
    'pengeluaran', coalesce(sum(t.jumlah) filter (where t.jenis = 'pengeluaran' and t.status = 'disetujui'), 0)
  )
  from public.transaksi_kas t
  where (p_jenis is null or p_jenis = '' or t.jenis = p_jenis)
    and (p_dari is null or t.tanggal >= p_dari)
    and (p_sampai is null or t.tanggal <= p_sampai)
$$;

-- ---------------------------------------------------------------------
-- 3. Log audit (hanya bisa ditambah; tidak bisa diubah atau dihapus lewat API)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  pelaku_id uuid,          -- tanpa foreign key: log tetap utuh walau akun pelaku dihapus
  pelaku_nama text,        -- salinan nama saat kejadian
  tabel text not null,
  aksi text not null check (aksi in ('INSERT', 'UPDATE', 'DELETE')),
  baris_id text,
  sebelum jsonb,           -- isi baris sebelum diubah/dihapus
  sesudah jsonb            -- isi baris sesudah ditambah/diubah
);
create index if not exists audit_tabel_waktu_idx on public.audit_log (tabel, waktu desc);
create index if not exists audit_baris_idx on public.audit_log (tabel, baris_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists audit_baca on public.audit_log;
create policy audit_baca on public.audit_log for select to authenticated
  using (public.bisa_lihat_kas_detail());

-- Cegah ubah/hapus siapa pun (termasuk admin lewat API). Perbaikan data hanya lewat SQL Editor oleh pemilik proyek.
create or replace function public._audit_tetap() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Log audit tidak dapat diubah atau dihapus' using errcode = '42501';
end $$;
drop trigger if exists audit_tetap on public.audit_log;
create trigger audit_tetap before update or delete on public.audit_log
  for each row execute function public._audit_tetap();

-- Perekam umum. Mencatat siapa (auth.uid) dan isi baris sebelum/sesudah. Perubahan tanpa beda isi diabaikan.
create or replace function public._audit_baris() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_pelaku uuid := auth.uid(); v_nama text; v_id text;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) = to_jsonb(old) then return null; end if;
  if v_pelaku is not null then
    select w.nama into v_nama from public.warga w where w.id = v_pelaku;
  end if;
  v_id := (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id';
  insert into public.audit_log (pelaku_id, pelaku_nama, tabel, aksi, baris_id, sebelum, sesudah)
  values (v_pelaku, v_nama, tg_table_name, tg_op, v_id,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return null;
end $$;

drop trigger if exists kas_audit on public.transaksi_kas;
create trigger kas_audit after insert or update or delete on public.transaksi_kas
  for each row execute function public._audit_baris();

-- Tagihan IPL: hanya penghapusan yang dicatat (penerbitan bulanan akan menghasilkan ratusan baris)
drop trigger if exists tagihan_audit_hapus on public.tagihan_ipl;
create trigger tagihan_audit_hapus after delete on public.tagihan_ipl
  for each row execute function public._audit_baris();

-- ---------------------------------------------------------------------
-- 4. Pulihkan transaksi kas manual yang terhapus
--    Memakai INSERT biasa sehingga trigger persetujuan tetap berlaku:
--    pengeluaran >= batas yang dipulihkan selain oleh Ketua kembali berstatus "menunggu".
-- ---------------------------------------------------------------------
create or replace function public.pulihkan_transaksi(p_audit_id bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.audit_log; v_id uuid; v_pencatat uuid;
begin
  if not public.is_bendahara() then
    raise exception 'Hanya bendahara atau Ketua yang dapat memulihkan transaksi' using errcode = '42501';
  end if;
  select * into a from public.audit_log where id = p_audit_id and tabel = 'transaksi_kas' and aksi = 'DELETE';
  if not found then raise exception 'Catatan penghapusan tidak ditemukan'; end if;
  if coalesce(a.sebelum ->> 'sumber', '') <> 'manual' then
    raise exception 'Hanya transaksi manual yang dapat dipulihkan';
  end if;
  v_id := (a.sebelum ->> 'id')::uuid;
  if exists (select 1 from public.transaksi_kas where id = v_id) then
    raise exception 'Transaksi ini sudah ada kembali di kas';
  end if;
  select w.id into v_pencatat from public.warga w where w.id = nullif(a.sebelum ->> 'dibuat_oleh', '')::uuid;

  insert into public.transaksi_kas (id, jenis, kategori, jumlah, tanggal, keterangan, bukti_path, sumber, dibuat_oleh, created_at)
  values (v_id, a.sebelum ->> 'jenis', a.sebelum ->> 'kategori', (a.sebelum ->> 'jumlah')::bigint, (a.sebelum ->> 'tanggal')::date,
          a.sebelum ->> 'keterangan', a.sebelum ->> 'bukti_path', 'manual', coalesce(v_pencatat, auth.uid()),
          coalesce((a.sebelum ->> 'created_at')::timestamptz, now()));

  perform public._aktivitas(auth.uid(), 'keuangan',
    'memulihkan transaksi ' || (a.sebelum ->> 'kategori') || ' Rp ' || (a.sebelum ->> 'jumlah'), false);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 4b. Tanggal bawaan memakai zona Asia/Jakarta (current_date di Supabase berbasis UTC,
--     sehingga pukul 00.00-07.00 WIB tercatat sebagai kemarin)
-- ---------------------------------------------------------------------
alter table public.transaksi_kas alter column tanggal set default ((now() at time zone 'Asia/Jakarta')::date);
alter table public.dokumen alter column tanggal set default ((now() at time zone 'Asia/Jakarta')::date);

-- ---------------------------------------------------------------------
-- 5. Hak eksekusi
-- ---------------------------------------------------------------------
revoke execute on function public._audit_baris() from public, anon, authenticated;
revoke execute on function public._audit_tetap() from public, anon, authenticated;
revoke execute on function public.periode_ipl_tersedia() from public, anon;
revoke execute on function public.ringkasan_transaksi(text, date, date) from public, anon;
revoke execute on function public.pulihkan_transaksi(bigint) from public, anon;
grant execute on function public.periode_ipl_tersedia() to authenticated;
grant execute on function public.ringkasan_transaksi(text, date, date) to authenticated;
grant execute on function public.pulihkan_transaksi(bigint) to authenticated;

-- #####################################################################
-- ##  BERKAS: 09-fitur-bendahara.sql
-- #####################################################################
-- =====================================================================
-- 09 — Fitur bendahara: laporan tunggakan, QRIS, dan tagihan IPL otomatis tiap bulan
-- Jalankan di Supabase > SQL Editor SETELAH 08-perbaikan-prioritas.sql. Aman dijalankan ulang.
--
--   1. pengaturan.qris_path           gambar QRIS paguyuban (tampil di halaman Bayar IPL)
--   2. pengaturan.tagihan_otomatis    saklar penerbitan tagihan otomatis (bawaan: mati)
--   3. tunggakan_ipl()                daftar rumah menunggak + kontak kepala keluarga (bendahara saja)
--   4. buat_tagihan_otomatis()        menerbitkan tagihan bulan berjalan; dijadwalkan pg_cron tiap tanggal 1
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1-2. Pengaturan
-- ---------------------------------------------------------------------
alter table public.pengaturan add column if not exists qris_path text;
alter table public.pengaturan add column if not exists tagihan_otomatis boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pengaturan_qris_path_check') then
    alter table public.pengaturan add constraint pengaturan_qris_path_check check (char_length(qris_path) <= 300);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Tunggakan: tagihan "belum bayar" yang sudah lewat jatuh tempo (jam Asia/Jakarta).
--    SECURITY INVOKER: tagihan yang terbaca tetap dibatasi RLS (pengurus blok hanya melihat bloknya).
--    Nomor HP dibaca dengan hak pemanggil, sehingga hanya terlihat bila kebijakan warga_kontak mengizinkan.
-- ---------------------------------------------------------------------
create or replace function public.tunggakan_ipl()
returns table (
  rumah_id uuid, kode text, blok text, gang_id uuid, gang_nama text,
  jumlah_bulan integer, total bigint, periode_tertua date, periode_terbaru date,
  nama text, nomor_hp text
) language sql stable security invoker set search_path = '' as $$
  with hari as (select (now() at time zone 'Asia/Jakarta')::date as ini),
  tg as (
    select t.rumah_id, count(*)::integer as jumlah_bulan, sum(t.nominal)::bigint as total,
           min(t.periode) as tertua, max(t.periode) as terbaru
    from public.tagihan_ipl t, hari
    where t.status = 'belum_bayar' and coalesce(t.jatuh_tempo, t.periode) < hari.ini
    group by t.rumah_id
  )
  select r.id, r.kode, r.blok, kk.gang_id, g.nama, tg.jumlah_bulan, tg.total, tg.tertua, tg.terbaru, kk.nama, k.nomor_hp
  from tg
  join public.rumah r on r.id = tg.rumah_id
  left join lateral (
    select w.id, w.nama, w.gang_id from public.warga w
    where w.rumah_id = r.id and w.status = 'aktif'
    order by w.kepala_keluarga desc, w.bergabung_at nulls last, w.created_at limit 1
  ) kk on true
  left join public.gang g on g.id = kk.gang_id
  left join public.warga_kontak k on k.warga_id = kk.id
  where public.is_bendahara()
  order by tg.total desc, r.kode
$$;

-- ---------------------------------------------------------------------
-- 4. Tagihan otomatis (dipanggil terjadwal, bukan oleh pengguna aplikasi)
--    Hanya berjalan bila admin menyalakan saklar di Pengaturan. Rumah yang sudah punya tagihan dilewati.
-- ---------------------------------------------------------------------
create or replace function public.buat_tagihan_otomatis()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_periode date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date; v_jumlah integer; s public.pengaturan;
begin
  select * into s from public.pengaturan where id = 1;
  if not found or not s.tagihan_otomatis then return 0; end if;
  insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select r.id, v_periode, coalesce(r.tarif_ipl, s.tarif_ipl), v_periode + (s.jatuh_tempo_hari - 1)
  from public.rumah r where r.status = 'dihuni'
  on conflict (rumah_id, periode) do nothing;
  get diagnostics v_jumlah = row_count;
  if v_jumlah > 0 then
    perform public._notif(
      (select array_agg(w.id) from public.warga w join public.tagihan_ipl t on t.rumah_id = w.rumah_id
        where t.periode = v_periode and w.status = 'aktif'),
      'Tagihan IPL ' || public._nama_periode(v_periode), 'Tagihan IPL bulan ini sudah terbit', 'ipl', '/ipl');
    perform public._aktivitas(null, 'ipl', 'tagihan IPL ' || public._nama_periode(v_periode) || ' terbit otomatis', false);
  end if;
  return v_jumlah;
end $$;

-- Jadwal: tanggal 1 pukul 00.05 UTC (= 07.05 WIB). Waktu pg_cron memakai UTC.
-- pg_cron tersedia di Supabase (Database > Extensions). Bila tidak ada, jadwal dilewati tanpa galat.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    begin
      perform cron.unschedule('tagihan-ipl-otomatis');
    exception when others then null;
    end;
    perform cron.schedule('tagihan-ipl-otomatis', '5 0 1 * *', 'select public.buat_tagihan_otomatis()');
    raise notice 'Jadwal tagihan otomatis dipasang (tanggal 1, 07.05 WIB).';
  else
    raise notice 'pg_cron tidak tersedia: aktifkan di Database > Extensions lalu jalankan ulang berkas ini.';
  end if;
exception when others then
  raise notice 'Jadwal tagihan otomatis dilewati: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- Hak eksekusi
-- ---------------------------------------------------------------------
revoke execute on function public.tunggakan_ipl() from public, anon;
grant execute on function public.tunggakan_ipl() to authenticated;
revoke execute on function public.buat_tagihan_otomatis() from public, anon, authenticated;

-- #####################################################################
-- ##  BERKAS: 10-polling-dan-rekap-alamat.sql
-- #####################################################################
-- =====================================================================
-- 10 — Polling warga + rekap alamat (blok / sub-blok / nomor)
-- Jalankan di Supabase > SQL Editor SETELAH 09-fitur-bendahara.sql. Aman dijalankan ulang.
--
--   1. polling, polling_opsi, polling_suara    jajak pendapat/voting warga (satu rumah satu suara, opsional)
--   2. buat_polling / beri_suara / daftar_polling / tutup_polling / hapus_polling
--   3. rekap_warga, rekap_rumah                tampilan dengan kolom blok, sub_blok, nomor terpisah (untuk rekap)
--
-- Suara disimpan tanpa kebijakan baca: tidak ada yang bisa melihat siapa memilih apa lewat API,
-- hanya jumlah per pilihan lewat daftar_polling().
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabel
-- ---------------------------------------------------------------------
create table if not exists public.polling (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (char_length(btrim(judul)) between 3 and 160),
  deskripsi text check (char_length(deskripsi) <= 1000),
  blok text references public.blok(kode) on update cascade,       -- kosong = semua blok
  gang_id uuid references public.gang(id) on delete cascade,      -- kosong = semua jalan
  pilih_banyak boolean not null default false,
  per_rumah boolean not null default true,                        -- true: satu rumah satu suara
  tutup_at timestamptz not null,
  ditutup_at timestamptz,                                         -- diisi bila ditutup lebih awal
  dibuat_oleh uuid references public.warga(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists polling_tutup_idx on public.polling (tutup_at desc);

create table if not exists public.polling_opsi (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references public.polling(id) on delete cascade,
  teks text not null check (char_length(btrim(teks)) between 1 and 120),
  urutan integer not null default 0
);
create index if not exists polling_opsi_polling_idx on public.polling_opsi (polling_id, urutan);

create table if not exists public.polling_suara (
  id uuid primary key default gen_random_uuid(),
  polling_id uuid not null references public.polling(id) on delete cascade,
  opsi_id uuid not null references public.polling_opsi(id) on delete cascade,
  warga_id uuid not null references public.warga(id) on delete cascade,
  rumah_id uuid references public.rumah(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (polling_id, opsi_id, warga_id)
);
create index if not exists polling_suara_polling_idx on public.polling_suara (polling_id);
create index if not exists polling_suara_warga_idx on public.polling_suara (polling_id, warga_id);
create index if not exists polling_suara_rumah_idx on public.polling_suara (polling_id, rumah_id);

alter table public.polling enable row level security;
alter table public.polling_opsi enable row level security;
alter table public.polling_suara enable row level security;
revoke all on public.polling, public.polling_opsi, public.polling_suara from anon, authenticated;
grant select on public.polling, public.polling_opsi to authenticated;

-- Peserta: warga aktif di sasaran polling, atau pengurus yang berwenang atas sasaran itu
create or replace function public._polling_peserta(p_blok text, p_gang uuid, p_warga uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.warga w
    where w.id = p_warga and w.status = 'aktif'
      and (p_blok is null or w.blok = p_blok) and (p_gang is null or w.gang_id = p_gang))
$$;

-- Versi untuk kebijakan RLS: hanya menanyakan "apakah saya peserta?" (dipanggil dengan hak pemanggil)
create or replace function public.polling_sasaran_saya(p_blok text, p_gang uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public._polling_peserta(p_blok, p_gang, auth.uid())
$$;

drop policy if exists polling_baca on public.polling;
create policy polling_baca on public.polling for select to authenticated
  using (public.is_aktif() and (public.polling_sasaran_saya(blok, gang_id) or public.bisa_kelola_info(blok, gang_id)));
drop policy if exists polling_opsi_baca on public.polling_opsi;
create policy polling_opsi_baca on public.polling_opsi for select to authenticated
  using (exists (select 1 from public.polling p where p.id = polling_id));

-- ---------------------------------------------------------------------
-- 2. Fungsi
-- ---------------------------------------------------------------------
create or replace function public.buat_polling(
  p_judul text, p_deskripsi text, p_opsi text[], p_tutup timestamptz,
  p_blok text default null, p_gang uuid default null,
  p_pilih_banyak boolean default false, p_per_rumah boolean default true)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_blok text := nullif(upper(btrim(coalesce(p_blok, ''))), ''); v_opsi text[]; i integer;
begin
  if p_gang is not null then
    select g.blok into v_blok from public.gang g where g.id = p_gang;
    if not found then raise exception 'Jalan tidak ditemukan'; end if;
  end if;
  if not public.bisa_kelola_info(v_blok, p_gang) then
    raise exception 'Anda tidak berwenang membuat polling untuk sasaran ini' using errcode = '42501';
  end if;
  select coalesce(array_agg(btrim(x) order by n), '{}') into v_opsi from unnest(p_opsi) with ordinality t(x, n) where btrim(coalesce(x, '')) <> '';
  if coalesce(array_length(v_opsi, 1), 0) < 2 or array_length(v_opsi, 1) > 10 then raise exception 'Isi 2 sampai 10 pilihan'; end if;
  if (select count(distinct lower(x)) from unnest(v_opsi) x) <> array_length(v_opsi, 1) then raise exception 'Pilihan tidak boleh sama'; end if;
  if exists (select 1 from unnest(v_opsi) x where char_length(x) > 120) then raise exception 'Pilihan terlalu panjang (maks. 120 huruf)'; end if;
  if p_tutup is null or p_tutup <= now() + interval '5 minutes' then raise exception 'Batas waktu harus di masa depan'; end if;
  if p_tutup > now() + interval '120 days' then raise exception 'Batas waktu maksimal 120 hari'; end if;

  insert into public.polling (judul, deskripsi, blok, gang_id, pilih_banyak, per_rumah, tutup_at, dibuat_oleh)
  values (btrim(p_judul), nullif(btrim(coalesce(p_deskripsi, '')), ''), v_blok, p_gang, coalesce(p_pilih_banyak, false), coalesce(p_per_rumah, true), p_tutup, auth.uid())
  returning id into v_id;
  for i in 1 .. array_length(v_opsi, 1) loop
    insert into public.polling_opsi (polling_id, teks, urutan) values (v_id, v_opsi[i], i);
  end loop;

  perform public._notif(
    (select array_agg(w.id) from public.warga w
      where w.status = 'aktif' and w.id <> auth.uid() and (v_blok is null or w.blok = v_blok) and (p_gang is null or w.gang_id = p_gang)),
    'Polling baru', left(btrim(p_judul), 120), 'pengumuman', '/polling');
  perform public._aktivitas(auth.uid(), 'pengumuman', 'membuat polling: ' || left(btrim(p_judul), 120), true);
  return v_id;
end $$;

create or replace function public.beri_suara(p_polling uuid, p_opsi uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.polling; v_rumah uuid; v_ids uuid[];
begin
  if auth.uid() is null or not public.is_aktif() then raise exception 'Hanya warga aktif yang dapat memberi suara' using errcode = '42501'; end if;
  select * into p from public.polling where id = p_polling for share;
  if not found then raise exception 'Polling tidak ditemukan'; end if;
  if not public._polling_peserta(p.blok, p.gang_id, auth.uid()) then raise exception 'Polling ini bukan untuk Anda' using errcode = '42501'; end if;
  if p.ditutup_at is not null or p.tutup_at <= now() then raise exception 'Polling sudah ditutup'; end if;
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_opsi, '{}')) x;
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'Pilih minimal satu pilihan'; end if;
  if array_length(v_ids, 1) > 1 and not p.pilih_banyak then raise exception 'Polling ini hanya boleh satu pilihan'; end if;
  if (select count(*) from public.polling_opsi o where o.polling_id = p.id and o.id = any (v_ids)) <> array_length(v_ids, 1) then
    raise exception 'Pilihan tidak valid';
  end if;
  select w.rumah_id into v_rumah from public.warga w where w.id = auth.uid();
  if p.per_rumah then
    if v_rumah is null then raise exception 'Akun Anda belum terhubung ke rumah' using errcode = '42501'; end if;
    -- kunci per rumah agar dua anggota satu rumah tidak lolos bersamaan
    perform pg_advisory_xact_lock(hashtextextended(p.id::text || v_rumah::text, 0));
    if exists (select 1 from public.polling_suara s where s.polling_id = p.id and s.rumah_id = v_rumah) then
      raise exception 'Rumah Anda sudah memberi suara' using errcode = '23505';
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(p.id::text || auth.uid()::text, 0));
    if exists (select 1 from public.polling_suara s where s.polling_id = p.id and s.warga_id = auth.uid()) then
      raise exception 'Anda sudah memberi suara' using errcode = '23505';
    end if;
  end if;
  insert into public.polling_suara (polling_id, opsi_id, warga_id, rumah_id)
  select p.id, x, auth.uid(), v_rumah from unnest(v_ids) x;
end $$;

-- Satu objek polling lengkap dengan hitungan. Jumlah per pilihan disembunyikan (null) sampai pemanggil
-- sudah memilih, polling ditutup, atau pemanggil berwenang atas sasaran (agar tidak memengaruhi pilihan).
create or replace function public._polling_json(p public.polling) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_tutup boolean := p.ditutup_at is not null or p.tutup_at <= now();
        v_sudah boolean; v_lihat boolean; v_hak integer; v_pemilih integer;
begin
  v_sudah := exists (select 1 from public.polling_suara s where s.polling_id = p.id
    and (s.warga_id = auth.uid() or (p.per_rumah and s.rumah_id is not null and s.rumah_id = (select w.rumah_id from public.warga w where w.id = auth.uid()))));
  v_lihat := v_tutup or v_sudah or public.bisa_kelola_info(p.blok, p.gang_id);
  select case when p.per_rumah then count(distinct w.rumah_id) else count(*) end into v_hak
    from public.warga w where w.status = 'aktif' and (p.per_rumah is not true or w.rumah_id is not null)
      and (p.blok is null or w.blok = p.blok) and (p.gang_id is null or w.gang_id = p.gang_id);
  select case when p.per_rumah then count(distinct s.rumah_id) else count(distinct s.warga_id) end into v_pemilih
    from public.polling_suara s where s.polling_id = p.id;
  return jsonb_build_object(
    'id', p.id, 'judul', p.judul, 'deskripsi', p.deskripsi, 'blok', p.blok, 'gang_id', p.gang_id,
    'pilih_banyak', p.pilih_banyak, 'per_rumah', p.per_rumah, 'tutup_at', p.tutup_at, 'ditutup_at', p.ditutup_at,
    'created_at', p.created_at, 'dibuat_oleh', p.dibuat_oleh,
    'pembuat', (select w.nama from public.warga w where w.id = p.dibuat_oleh),
    'selesai', v_tutup, 'sudah_memilih', v_sudah, 'hasil_terlihat', v_lihat,
    'hak_suara', v_hak, 'pemilih', case when v_lihat then v_pemilih end,
    'bisa_kelola', (p.dibuat_oleh = auth.uid() or public.is_ketua() or public.is_admin()),
    'opsi', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'teks', o.teks,
               'jumlah', case when v_lihat then (select count(*) from public.polling_suara s where s.opsi_id = o.id) end) order by o.urutan), '[]'::jsonb)
             from public.polling_opsi o where o.polling_id = p.id)
  );
end $$;

create or replace function public.daftar_polling(p_batas integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.polling; hasil jsonb := '[]'::jsonb;
begin
  if not public.is_aktif() then return hasil; end if;
  for r in
    select * from public.polling q
    where public._polling_peserta(q.blok, q.gang_id, auth.uid()) or public.bisa_kelola_info(q.blok, q.gang_id)
    order by (q.ditutup_at is null and q.tutup_at > now()) desc, q.tutup_at desc
    limit least(greatest(coalesce(p_batas, 50), 1), 200)
  loop
    hasil := hasil || public._polling_json(r);
  end loop;
  return hasil;
end $$;

create or replace function public.tutup_polling(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.polling;
begin
  select * into p from public.polling where id = p_id;
  if not found then raise exception 'Polling tidak ditemukan'; end if;
  if not (p.dibuat_oleh = auth.uid() or public.is_ketua() or public.is_admin()) then
    raise exception 'Hanya pembuat polling, Ketua, atau admin yang dapat menutupnya' using errcode = '42501';
  end if;
  update public.polling set ditutup_at = coalesce(ditutup_at, now()) where id = p_id;
end $$;

create or replace function public.hapus_polling(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.polling;
begin
  select * into p from public.polling where id = p_id;
  if not found then raise exception 'Polling tidak ditemukan'; end if;
  if not (p.dibuat_oleh = auth.uid() or public.is_ketua() or public.is_admin()) then
    raise exception 'Hanya pembuat polling, Ketua, atau admin yang dapat menghapusnya' using errcode = '42501';
  end if;
  delete from public.polling where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- 3. Rekap alamat: blok, sub_blok, nomor terpisah (security invoker: RLS pemanggil tetap berlaku)
--    no_rumah "3/5" = sub-blok 3, nomor 5; "12" = nomor 12 tanpa sub-blok.
-- ---------------------------------------------------------------------
create or replace view public.rekap_warga with (security_invoker = true) as
select w.id, w.nama, w.status, w.role, w.kepala_keluarga, w.blok,
       case when position('/' in w.no_rumah) > 0 then split_part(w.no_rumah, '/', 1) end as sub_blok,
       case when position('/' in w.no_rumah) > 0 then substr(w.no_rumah, position('/' in w.no_rumah) + 1) else w.no_rumah end as nomor,
       w.no_rumah, w.gang_id, g.nama as gang, w.rumah_id
from public.warga w left join public.gang g on g.id = w.gang_id;

create or replace view public.rekap_rumah with (security_invoker = true) as
select r.id, r.kode, r.blok,
       case when position('/' in r.nomor) > 0 then split_part(r.nomor, '/', 1) end as sub_blok,
       case when position('/' in r.nomor) > 0 then substr(r.nomor, position('/' in r.nomor) + 1) else r.nomor end as nomor,
       r.nomor as no_rumah, r.status, r.tarif_ipl
from public.rumah r;

revoke all on public.rekap_warga, public.rekap_rumah from anon, authenticated;
grant select on public.rekap_warga, public.rekap_rumah to authenticated;

-- ---------------------------------------------------------------------
-- Hak eksekusi
-- ---------------------------------------------------------------------
revoke execute on function public._polling_peserta(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public._polling_json(public.polling) from public, anon, authenticated;
revoke execute on function public.polling_sasaran_saya(text, uuid) from public, anon;
grant execute on function public.polling_sasaran_saya(text, uuid) to authenticated;
revoke execute on function public.buat_polling(text, text, text[], timestamptz, text, uuid, boolean, boolean) from public, anon;
revoke execute on function public.beri_suara(uuid, uuid[]) from public, anon;
revoke execute on function public.daftar_polling(integer) from public, anon;
revoke execute on function public.tutup_polling(uuid) from public, anon;
revoke execute on function public.hapus_polling(uuid) from public, anon;
grant execute on function public.buat_polling(text, text, text[], timestamptz, text, uuid, boolean, boolean) to authenticated;
grant execute on function public.beri_suara(uuid, uuid[]) to authenticated;
grant execute on function public.daftar_polling(integer) to authenticated;
grant execute on function public.tutup_polling(uuid) to authenticated;
grant execute on function public.hapus_polling(uuid) to authenticated;

-- #####################################################################
-- ##  BERKAS: 11-nomor-jalan.sql
-- #####################################################################
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

-- #####################################################################
-- ##  BERKAS: 12-status-hunian.sql
-- #####################################################################
-- 12 · Status hunian warga: rumah yang ditempati milik sendiri atau kontrak.
-- Disimpan di warga_kontak (data sensus) seperti status pernikahan, sehingga hanya
-- terbaca pemilik data dan pengurus berwenang. Aman dijalankan ulang. Tidak menghapus data.
alter table public.warga_kontak add column if not exists status_hunian text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kontak_status_hunian_check') then
    alter table public.warga_kontak add constraint kontak_status_hunian_check
      check (status_hunian is null or status_hunian in ('milik_sendiri', 'kontrak'));
  end if;
end $$;

-- #####################################################################
-- ##  BERKAS: 13-pin-awal-acak.sql
-- #####################################################################
-- =====================================================================
-- 13-pin-awal-acak.sql
-- PIN awal ACAK per warga untuk Import CSV dan Tambah warga (menggantikan PIN seragam 123456).
--
-- Cara kerja:
--  * import_warga membuat PIN 6 angka acak untuk setiap akun baru (pgcrypto, bukan random()).
--  * PIN hanya dikembalikan SATU KALI dalam hasil fungsi (daftar "akun") kepada admin.
--    Di database hanya tersimpan hash-nya; PIN asli tidak dicatat di log aktivitas.
--  * Warga tetap wajib mengganti PIN saat pertama masuk (wajib_ganti_pin = true).
--  * Parameter p_pin dipertahankan agar tanda tangan fungsi tidak berubah, tetapi DIABAIKAN.
--
-- Aman dijalankan ulang. Tidak mengubah/menghapus data. Jalankan setelah 12-status-hunian.sql.
-- =====================================================================

-- PIN acak 6 angka, angka pertama bukan 0 (agar tidak hilang saat CSV dibuka di Excel),
-- dan bukan pola mudah ditebak (111111, 123456, 654321, 121212, 123123, dst.).
create or replace function public._pin_acak()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  b bytea; n bigint; p text; mudah boolean;
begin
  loop
    b := extensions.gen_random_bytes(4);
    n := (get_byte(b, 0)::bigint << 24) + (get_byte(b, 1)::bigint << 16) + (get_byte(b, 2)::bigint << 8) + get_byte(b, 3)::bigint;
    p := (100000 + (n % 900000))::text;
    mudah := p ~ '^(\d)\1{5}$'
          or p ~ '^(\d\d)\1\1$' or p ~ '^(\d\d\d)\1$'
          or position(p in '01234567890123456789') > 0
          or position(p in '98765432109876543210') > 0;
    exit when not mudah;
  end loop;
  return p;
end $$;
revoke execute on function public._pin_acak() from public, anon, authenticated;

-- Import warga (admin). p_pin sudah tidak dipakai (diabaikan); tiap akun mendapat PIN acak sendiri.
-- Hasil: {dibuat, dilewati:[{baris,nama,alasan}], akun:[{baris,nama,hp,pin}]}
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_akun jsonb := '[]'::jsonb;
  v_pin text;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
  v_gang_teks text; v_gang uuid; v_nikah text; v_anak text; v_foto text;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;

  perform set_config('app.import', '1', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
      v_hp := public.normalisasi_hp(r ->> 'hp');
      v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
      v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
      v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60);
      v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', r ->> 'jalan', '')), '');
      v_gang := null;
      v_nikah := case lower(btrim(coalesce(r ->> 'status_pernikahan', '')))
        when '' then null
        when 'belum_menikah' then 'belum_menikah' when 'belum menikah' then 'belum_menikah' when 'lajang' then 'belum_menikah' when 'belum kawin' then 'belum_menikah'
        when 'menikah' then 'menikah' when 'sudah menikah' then 'menikah' when 'kawin' then 'menikah'
        when 'cerai_hidup' then 'cerai_hidup' when 'cerai hidup' then 'cerai_hidup'
        when 'cerai_mati' then 'cerai_mati' when 'cerai mati' then 'cerai_mati'
        else 'x' end;
      if v_nikah = 'x' then raise exception 'Status pernikahan "%" tidak dikenal', r ->> 'status_pernikahan'; end if;
      v_anak := nullif(btrim(coalesce(r ->> 'jumlah_anak', '')), '');
      if v_anak is not null and v_anak !~ '^[0-9]{1,2}$' then raise exception 'Jumlah anak harus angka 0-30'; end if;
      if v_anak is not null and v_anak::integer > 30 then raise exception 'Jumlah anak harus angka 0-30'; end if;
      v_foto := nullif(btrim(coalesce(r ->> 'foto', '')), '');
      if v_foto is not null and (v_foto !~* '^https://[^[:space:]]+$' or char_length(v_foto) > 480) then raise exception 'Tautan foto harus diawali https://'; end if;

      if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
      if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok % tidak dikenal', v_blok; end if;
      if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid'; end if;
      if v_gang_teks is not null then
        select g.id into v_gang from public.gang g
         where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
         order by (g.blok is not null) desc limit 1;
        if v_gang is null then raise exception 'Gang/jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
      end if;

      v_email := v_hp || '@' || v_domain;
      if exists (select 1 from public.warga_kontak where nomor_hp = v_hp)
         or exists (select 1 from auth.users where lower(email) = v_email) then
        raise exception 'Nomor HP sudah terdaftar';
      end if;

      v_id := gen_random_uuid();
      v_pin := public._pin_acak();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(v_pin, extensions.gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', v_nama, 'nomor_hp', v_hp, 'blok', v_blok, 'no_rumah', v_no, 'gang_id', v_gang),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now());

      v_kk := case lower(coalesce(r ->> 'kepala_keluarga', ''))
                when 'ya' then true when 'y' then true when 'true' then true when '1' then true when 'kk' then true
                when 'tidak' then false when 'n' then false when 'false' then false when '0' then false
                else not exists (select 1 from public.warga w where w.blok = v_blok and w.no_rumah = v_no and w.kepala_keluarga)
              end;

      perform set_config('app.bypass', '1', true);
      update public.warga
         set status = 'aktif', kepala_keluarga = v_kk, pekerjaan = coalesce(v_kerja, pekerjaan),
             foto_path = v_foto,
             bergabung_at = now(), disetujui_oleh = auth.uid(), wajib_ganti_pin = true
       where id = v_id;
      update public.warga_kontak set status_pernikahan = v_nikah, jumlah_anak = v_anak::smallint where warga_id = v_id;
      perform set_config('app.bypass', '', true);

      -- Dua baris terakhir tanpa kemungkinan galat (variabel plpgsql tidak ikut di-rollback)
      v_akun := v_akun || jsonb_build_array(jsonb_build_object('baris', i, 'nama', v_nama, 'hp', v_hp, 'pin', v_pin));
      v_dibuat := v_dibuat + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', coalesce(r ->> 'nama', ''), 'alasan', sqlerrm));
    end;
  end loop;

  perform set_config('app.import', '', true);
  if v_dibuat > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'mengimpor ' || v_dibuat || ' warga', false);
  end if;
  return jsonb_build_object('dibuat', v_dibuat, 'dilewati', v_skip, 'akun', v_akun);
end $$;

revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;

-- #####################################################################
-- ##  BERKAS: 14-batas-percobaan-login.sql
-- #####################################################################
-- =====================================================================
-- 14-batas-percobaan-login.sql
-- Pembatasan percobaan login: penundaan bertahap setelah PIN salah berulang + peringatan ke pengurus.
--
-- PENTING - dua lapis, dengan kekuatan berbeda:
--  1) LAPIS APLIKASI (aktif begitu SQL ini dijalankan): halaman Login memanggil cek_batas_login /
--     catat_login_gagal. Ini mencegah salah ketik berulang dan serangan lewat halaman login, tetapi
--     BISA DILEWATI oleh penyerang yang memanggil API Supabase Auth langsung (tanpa halaman login).
--  2) LAPIS SERVER (opsional, hanya bila paket Supabase Anda menyediakan "Auth Hooks"):
--     aktifkan hook "Password verification" dan arahkan ke public.hook_verifikasi_pin.
--     Setelah itu penundaan berlaku untuk SEMUA jalur login, termasuk panggilan API langsung.
--     Menu: Dashboard Supabase > Authentication > Hooks > Password verification attempt.
--     (Ketersediaan hook ini menurut paket belum kami pastikan; cek di dashboard Anda.)
--
-- Jadwal penundaan (gagal berturut-turut -> tunggu):  1-4: tanpa tunda | 5: 30 dtk | 6: 1 mnt |
--   7: 5 mnt | 8: 15 mnt | 9 dst.: 1 jam (batas atas). Penghitung ulang bila gagal terakhir > 6 jam lalu,
--   atau setelah masuk berhasil, atau dibuka admin.
-- Risiko yang diterima: orang lain dapat sengaja membuat akun korban tertunda (maks. 1 jam per tunda).
--   Admin dapat membuka kunci lewat Data anggota > Ubah anggota.
--
-- Aman dijalankan ulang. Tidak menghapus data warga. Jalankan setelah 13-pin-awal-acak.sql.
-- =====================================================================

create table if not exists public.percobaan_login (
  nomor_hp text primary key,
  gagal_beruntun integer not null default 0,
  gagal_total integer not null default 0,
  gagal_terakhir_at timestamptz,
  terkunci_sampai timestamptz,
  peringatan_at timestamptz,
  hook_at timestamptz,
  dibuka_oleh uuid references public.warga(id) on delete set null,
  dibuka_at timestamptz
);
alter table public.percobaan_login enable row level security;
revoke all on public.percobaan_login from anon, authenticated;
grant select on public.percobaan_login to authenticated;
drop policy if exists percobaan_login_admin on public.percobaan_login;
create policy percobaan_login_admin on public.percobaan_login for select to authenticated using (public.is_admin());

-- Penanda apakah hook sisi server pernah dipanggil (untuk indikator di aplikasi). Satu baris saja.
create table if not exists public.status_keamanan (
  id integer primary key check (id = 1),
  hook_login_terakhir_at timestamptz
);
insert into public.status_keamanan (id) values (1) on conflict (id) do nothing;
alter table public.status_keamanan enable row level security;
revoke all on public.status_keamanan from anon, authenticated;
grant select on public.status_keamanan to authenticated;
drop policy if exists status_keamanan_admin on public.status_keamanan;
create policy status_keamanan_admin on public.status_keamanan for select to authenticated using (public.is_admin());

-- Lama tunda (detik) untuk jumlah gagal berturut-turut
create or replace function public._jeda_login(p_gagal integer)
returns integer language sql immutable set search_path = '' as $$
  select case when p_gagal < 5 then 0 when p_gagal = 5 then 30 when p_gagal = 6 then 60
              when p_gagal = 7 then 300 when p_gagal = 8 then 900 else 3600 end
$$;

-- Sisa detik tunggu untuk satu nomor (0 bila tidak ditunda)
create or replace function public._sisa_tunggu(p_hp text)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select greatest(0, ceil(extract(epoch from (terkunci_sampai - now()))))::integer
                     from public.percobaan_login where nomor_hp = p_hp), 0)
$$;

-- Catat satu percobaan gagal. Mengembalikan {tunggu, sisa}: detik tunggu saat ini dan sisa percobaan sebelum tunda.
create or replace function public._login_gagal(p_hp text, p_dari_hook boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_n integer; v_pw timestamptz; v_warga record;
begin
  insert into public.percobaan_login as p (nomor_hp, gagal_beruntun, gagal_total, gagal_terakhir_at, terkunci_sampai, hook_at)
  values (p_hp, 1, 1, now(), null, case when p_dari_hook then now() end)
  on conflict (nomor_hp) do update set
    gagal_beruntun = case when p.gagal_terakhir_at is null or p.gagal_terakhir_at < now() - interval '6 hours' then 1 else p.gagal_beruntun + 1 end,
    gagal_total = p.gagal_total + 1,
    gagal_terakhir_at = now(),
    hook_at = case when p_dari_hook then now() else p.hook_at end
  returning gagal_beruntun, peringatan_at into v_n, v_pw;

  if public._jeda_login(v_n) > 0 then
    update public.percobaan_login
       set terkunci_sampai = greatest(coalesce(terkunci_sampai, now()), now() + make_interval(secs => public._jeda_login(v_n)))
     where nomor_hp = p_hp;
  end if;

  -- Peringatan ke pengurus: hanya untuk akun yang benar-benar ada, pada gagal ke-5 lalu tiap kelipatan 10,
  -- dan paling sering sekali per jam per akun (agar tidak bisa dipakai membanjiri notifikasi).
  if (v_n = 5 or (v_n > 5 and v_n % 10 = 0)) and (v_pw is null or v_pw < now() - interval '1 hour') then
    select w.nama, w.blok, w.no_rumah into v_warga
      from public.warga_kontak k join public.warga w on w.id = k.warga_id where k.nomor_hp = p_hp;
    if found then
      perform public._notif_pengurus(
        'Login gagal berulang: ' || v_warga.nama,
        v_warga.nama || coalesce(' (' || nullif(trim(coalesce(v_warga.blok, '') || ' ' || coalesce(v_warga.no_rumah, '')), '') || ')', '')
          || ' gagal masuk ' || v_n || ' kali berturut-turut; akun ditunda sementara. Bila itu warga yang lupa PIN, admin dapat mengatur ulang PIN atau membuka kunci di Data anggota. Bila bukan, waspadai upaya masuk oleh orang lain.',
        'akun', '/warga?tab=anggota');
      update public.percobaan_login set peringatan_at = now() where nomor_hp = p_hp;
    end if;
  end if;

  -- Bersih-bersih ringan: buang catatan lama yang tidak sedang ditunda
  if random() < 0.02 then
    delete from public.percobaan_login
     where coalesce(gagal_terakhir_at, '-infinity'::timestamptz) < now() - interval '2 days'
       and (terkunci_sampai is null or terkunci_sampai < now());
  end if;

  return jsonb_build_object('tunggu', public._sisa_tunggu(p_hp), 'sisa', greatest(0, 5 - v_n));
end $$;

-- ---- Dipanggil halaman Login (belum masuk, peran anon) ----
create or replace function public.cek_batas_login(p_hp text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp); v_n integer;
begin
  if v_hp is null then return jsonb_build_object('tunggu', 0, 'sisa', 5); end if;
  select case when gagal_terakhir_at < now() - interval '6 hours' then 0 else gagal_beruntun end into v_n
    from public.percobaan_login where nomor_hp = v_hp;
  return jsonb_build_object('tunggu', public._sisa_tunggu(v_hp), 'sisa', greatest(0, 5 - coalesce(v_n, 0)));
end $$;

create or replace function public.catat_login_gagal(p_hp text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp);
begin
  if v_hp is null then return jsonb_build_object('tunggu', 0, 'sisa', 5); end if;
  -- Bila hook sisi server baru saja mencatat percobaan ini, jangan hitung dua kali.
  if exists (select 1 from public.percobaan_login where nomor_hp = v_hp and hook_at > now() - interval '15 seconds') then
    return public.cek_batas_login(v_hp);
  end if;
  return public._login_gagal(v_hp, false);
end $$;

-- Setelah masuk berhasil: hapus penghitung milik sendiri (peran authenticated)
create or replace function public.catat_login_berhasil()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.percobaan_login p
   using public.warga_kontak k
   where k.warga_id = auth.uid() and p.nomor_hp = k.nomor_hp
     and (p.terkunci_sampai is null or p.terkunci_sampai < now());
end $$;

-- ---- Admin ----
create or replace function public.buka_kunci_login(p_warga_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hp text; v_nama text;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  select k.nomor_hp, w.nama into v_hp, v_nama
    from public.warga_kontak k join public.warga w on w.id = k.warga_id where k.warga_id = p_warga_id;
  if v_hp is null then raise exception 'Anggota tidak ditemukan'; end if;
  delete from public.percobaan_login where nomor_hp = v_hp;
  perform public._aktivitas(auth.uid(), 'anggota', 'membuka kunci login ' || v_nama, false);
end $$;

-- Apakah hook sisi server pernah aktif? (untuk indikator admin) -> {hook_aktif, terakhir}
create or replace function public.status_penegakan_login()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v timestamptz;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  select hook_login_terakhir_at into v from public.status_keamanan where id = 1;
  return jsonb_build_object('hook_aktif', v is not null and v > now() - interval '30 days', 'terakhir', v);
end $$;

-- ---- Hook sisi server (opsional): Auth > Hooks > Password verification attempt ----
-- Masukan GoTrue: {"user_id": "...", "valid": true|false}. Keluaran: {"decision": "continue"|"reject", ...}.
-- should_logout_user SELALU false agar sesi aktif pemilik akun tidak ikut terputus.
create or replace function public.hook_verifikasi_pin(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hp text; v_valid boolean := coalesce((event ->> 'valid')::boolean, false); v_tunggu integer; v_r jsonb;
begin
  select k.nomor_hp into v_hp from public.warga_kontak k where k.warga_id = (event ->> 'user_id')::uuid;
  if v_hp is null then return jsonb_build_object('decision', 'continue'); end if;

  update public.status_keamanan set hook_login_terakhir_at = now() where id = 1;

  if v_valid then
    v_tunggu := public._sisa_tunggu(v_hp);
    if v_tunggu > 0 then
      update public.percobaan_login set hook_at = now() where nomor_hp = v_hp;
      return jsonb_build_object('decision', 'reject', 'should_logout_user', false,
        'message', 'Terlalu banyak percobaan salah. Coba lagi dalam ' || case when v_tunggu < 60 then v_tunggu || ' detik' else ceil(v_tunggu / 60.0)::integer || ' menit' end || '.');
    end if;
    delete from public.percobaan_login where nomor_hp = v_hp;
    return jsonb_build_object('decision', 'continue');
  end if;

  v_r := public._login_gagal(v_hp, true);
  if (v_r ->> 'tunggu')::integer > 0 then
    return jsonb_build_object('decision', 'reject', 'should_logout_user', false,
      'message', 'PIN salah. Terlalu banyak percobaan; coba lagi dalam ' || case when (v_r ->> 'tunggu')::integer < 60 then (v_r ->> 'tunggu') || ' detik' else ceil((v_r ->> 'tunggu')::integer / 60.0)::integer || ' menit' end || '.');
  end if;
  return jsonb_build_object('decision', 'continue');
end $$;

-- Hak eksekusi
revoke execute on function public._jeda_login(integer) from public, anon, authenticated;
revoke execute on function public._sisa_tunggu(text) from public, anon, authenticated;
revoke execute on function public._login_gagal(text, boolean) from public, anon, authenticated;
revoke execute on function public.cek_batas_login(text) from public;
revoke execute on function public.catat_login_gagal(text) from public;
revoke execute on function public.catat_login_berhasil() from public, anon;
revoke execute on function public.buka_kunci_login(uuid) from public, anon;
revoke execute on function public.status_penegakan_login() from public, anon;
revoke execute on function public.hook_verifikasi_pin(jsonb) from public, anon, authenticated;
grant execute on function public.cek_batas_login(text) to anon, authenticated;
grant execute on function public.catat_login_gagal(text) to anon, authenticated;
grant execute on function public.catat_login_berhasil() to authenticated;
grant execute on function public.buka_kunci_login(uuid) to authenticated;
grant execute on function public.status_penegakan_login() to authenticated;

-- Peran supabase_auth_admin (hanya ada di Supabase sungguhan) harus boleh memanggil hook
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.hook_verifikasi_pin(jsonb) to supabase_auth_admin;
  end if;
end $$;

-- #####################################################################
-- ##  BERKAS: 15-import-hunian.sql
-- #####################################################################
-- =====================================================================
-- 15-import-hunian.sql
-- Status hunian (rumah yang ditempati: milik sendiri / kontrak) diisi LANGSUNG oleh fungsi import_warga,
-- dalam proses yang sama dengan pembuatan akun (sebelumnya aplikasi mengisinya lewat pembaruan terpisah
-- setelah import, sehingga bisa gagal sebagian). Mempertahankan PIN acak dari 13.
--
-- Aman dijalankan ulang. Tidak mengubah/menghapus data. Prasyarat: 12-status-hunian.sql dan 13-pin-awal-acak.sql.
-- =====================================================================

-- Import warga (admin): PIN awal acak per akun (13) + kolom status_hunian (milik_sendiri / kontrak) dalam satu proses.
-- Penyimpanan hunian ikut satu transaksi dengan pembuatan akun: bila hunian tidak valid, baris itu dilewati utuh.
-- Hasil: {dibuat, dilewati:[{baris,nama,alasan}], akun:[{baris,nama,hp,pin}]}
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_akun jsonb := '[]'::jsonb;
  v_pin text;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
  v_gang_teks text; v_gang uuid; v_nikah text; v_anak text; v_foto text; v_hunian text;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;

  perform set_config('app.import', '1', true);

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
      v_hp := public.normalisasi_hp(r ->> 'hp');
      v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
      v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
      v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60);
      v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', r ->> 'jalan', '')), '');
      v_gang := null;
      v_nikah := case lower(btrim(coalesce(r ->> 'status_pernikahan', '')))
        when '' then null
        when 'belum_menikah' then 'belum_menikah' when 'belum menikah' then 'belum_menikah' when 'lajang' then 'belum_menikah' when 'belum kawin' then 'belum_menikah'
        when 'menikah' then 'menikah' when 'sudah menikah' then 'menikah' when 'kawin' then 'menikah'
        when 'cerai_hidup' then 'cerai_hidup' when 'cerai hidup' then 'cerai_hidup'
        when 'cerai_mati' then 'cerai_mati' when 'cerai mati' then 'cerai_mati'
        else 'x' end;
      if v_nikah = 'x' then raise exception 'Status pernikahan "%" tidak dikenal', r ->> 'status_pernikahan'; end if;
      v_anak := nullif(btrim(coalesce(r ->> 'jumlah_anak', '')), '');
      if v_anak is not null and v_anak !~ '^[0-9]{1,2}$' then raise exception 'Jumlah anak harus angka 0-30'; end if;
      if v_anak is not null and v_anak::integer > 30 then raise exception 'Jumlah anak harus angka 0-30'; end if;
      v_hunian := case lower(btrim(coalesce(r ->> 'status_hunian', '')))
        when '' then null
        when 'milik_sendiri' then 'milik_sendiri' when 'milik sendiri' then 'milik_sendiri' when 'milik' then 'milik_sendiri'
        when 'sendiri' then 'milik_sendiri' when 'pribadi' then 'milik_sendiri' when 'hak milik' then 'milik_sendiri'
        when 'kontrak' then 'kontrak' when 'kontrakan' then 'kontrak' when 'sewa' then 'kontrak' when 'sewa/kontrak' then 'kontrak' when 'kos' then 'kontrak'
        else 'x' end;
      if v_hunian = 'x' then raise exception 'Rumah ditempati "%" tidak dikenal (isi milik sendiri atau kontrak)', r ->> 'status_hunian'; end if;
      v_foto := nullif(btrim(coalesce(r ->> 'foto', '')), '');
      if v_foto is not null and (v_foto !~* '^https://[^[:space:]]+$' or char_length(v_foto) > 480) then raise exception 'Tautan foto harus diawali https://'; end if;

      if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
      if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok % tidak dikenal', v_blok; end if;
      if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid'; end if;
      if v_gang_teks is not null then
        select g.id into v_gang from public.gang g
         where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
         order by (g.blok is not null) desc limit 1;
        if v_gang is null then raise exception 'Gang/jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
      end if;

      v_email := v_hp || '@' || v_domain;
      if exists (select 1 from public.warga_kontak where nomor_hp = v_hp)
         or exists (select 1 from auth.users where lower(email) = v_email) then
        raise exception 'Nomor HP sudah terdaftar';
      end if;

      v_id := gen_random_uuid();
      v_pin := public._pin_acak();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(v_pin, extensions.gen_salt('bf', 10)), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nama', v_nama, 'nomor_hp', v_hp, 'blok', v_blok, 'no_rumah', v_no, 'gang_id', v_gang),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id::text, v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now());

      v_kk := case lower(coalesce(r ->> 'kepala_keluarga', ''))
                when 'ya' then true when 'y' then true when 'true' then true when '1' then true when 'kk' then true
                when 'tidak' then false when 'n' then false when 'false' then false when '0' then false
                else not exists (select 1 from public.warga w where w.blok = v_blok and w.no_rumah = v_no and w.kepala_keluarga)
              end;

      perform set_config('app.bypass', '1', true);
      update public.warga
         set status = 'aktif', kepala_keluarga = v_kk, pekerjaan = coalesce(v_kerja, pekerjaan),
             foto_path = v_foto,
             bergabung_at = now(), disetujui_oleh = auth.uid(), wajib_ganti_pin = true
       where id = v_id;
      update public.warga_kontak set status_pernikahan = v_nikah, jumlah_anak = v_anak::smallint, status_hunian = v_hunian where warga_id = v_id;
      perform set_config('app.bypass', '', true);

      -- Dua baris terakhir tanpa kemungkinan galat (variabel plpgsql tidak ikut di-rollback)
      v_akun := v_akun || jsonb_build_array(jsonb_build_object('baris', i, 'nama', v_nama, 'hp', v_hp, 'pin', v_pin));
      v_dibuat := v_dibuat + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', coalesce(r ->> 'nama', ''), 'alasan', sqlerrm));
    end;
  end loop;

  perform set_config('app.import', '', true);
  if v_dibuat > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'mengimpor ' || v_dibuat || ' warga', false);
  end if;
  return jsonb_build_object('dibuat', v_dibuat, 'dilewati', v_skip, 'akun', v_akun);
end $$;

revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;

-- #####################################################################
-- ##  BERKAS: 16-status-tagihan-otomatis.sql
-- #####################################################################
-- =====================================================================
-- 16-status-tagihan-otomatis.sql
-- Penanda untuk admin: apakah penerbitan tagihan IPL otomatis benar-benar akan berjalan.
-- Tagihan otomatis butuh (a) saklar menyala di Pengaturan, dan (b) pg_cron aktif dengan jadwal
-- 'tagihan-ipl-otomatis' (dipasang oleh 09-fitur-bendahara.sql). Bila pg_cron tidak ada, 09 hanya
-- memberi NOTICE, sehingga tanpa penanda ini admin tidak tahu tagihan tidak pernah terbit.
--
-- status_tagihan_otomatis() hanya untuk admin dan hanya MEMBACA. Aman dijalankan ulang.
-- Prasyarat: 09-fitur-bendahara.sql.
-- =====================================================================
create or replace function public.status_tagihan_otomatis()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_saklar boolean := false;
  v_cron boolean := to_regclass('cron.job') is not null;
  v_jadwal boolean := false;
  v_aktif boolean := false;
  v_terakhir timestamptz;
  v_status text;
  v_periode date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_tagihan integer;
  v_masalah text;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;

  select coalesce(tagihan_otomatis, false) into v_saklar from public.pengaturan where id = 1;

  if v_cron then
    begin
      execute $q$select count(*) > 0, coalesce(bool_or(active), false) from cron.job where jobname = 'tagihan-ipl-otomatis'$q$
        into v_jadwal, v_aktif;
    exception when others then
      v_cron := false; -- tidak berhak membaca cron.job: anggap tidak terverifikasi
    end;
    if v_cron and v_jadwal and to_regclass('cron.job_run_details') is not null then
      begin
        execute $q$select d.start_time, d.status from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                    where j.jobname = 'tagihan-ipl-otomatis' order by d.start_time desc limit 1$q$
          into v_terakhir, v_status;
      exception when others then null;
      end;
    end if;
  end if;

  select count(*) into v_tagihan from public.tagihan_ipl where periode = v_periode;

  if not v_cron then
    v_masalah := 'pg_cron belum aktif (atau tidak dapat diperiksa). Aktifkan di Supabase > Database > Extensions, lalu jalankan ulang 09-fitur-bendahara.sql agar jadwal dipasang.';
  elsif not v_jadwal then
    v_masalah := 'Jadwal tagihan otomatis belum terpasang. Jalankan ulang 09-fitur-bendahara.sql setelah pg_cron aktif.';
  elsif not v_aktif then
    v_masalah := 'Jadwal tagihan otomatis ada tetapi dinonaktifkan di pg_cron.';
  elsif v_status is not null and v_status <> 'succeeded' then
    v_masalah := 'Jalan terakhir jadwal tagihan otomatis tidak berhasil (status: ' || v_status || '). Periksa cron.job_run_details.';
  end if;

  return jsonb_build_object(
    'saklar', v_saklar, 'cron_ada', v_cron, 'jadwal_ada', v_jadwal, 'jadwal_aktif', v_aktif,
    'terakhir_jalan', v_terakhir, 'terakhir_status', v_status, 'tagihan_bulan_ini', v_tagihan,
    'siap', v_masalah is null, 'masalah', v_masalah,
    -- Peringatan keras hanya bila saklar menyala tetapi jadwal tidak bisa berjalan
    'perlu_tindakan', v_saklar and v_masalah is not null
  );
end $$;

revoke execute on function public.status_tagihan_otomatis() from public, anon;
grant execute on function public.status_tagihan_otomatis() to authenticated;

-- #####################################################################
-- ##  BERKAS: 17-batasi-bucket-publik.sql
-- #####################################################################
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

-- #####################################################################
-- ##  BERKAS: 18-nama-paguyuban-vgr.sql
-- #####################################################################
-- =====================================================================
-- 18 — Nama paguyuban: "Paguyuban Vila Gading Royal"
-- Aman dijalankan ulang. Tidak menghapus data.
--  - Nama bawaan untuk instalasi baru diganti.
--  - Nama yang tersimpan hanya diganti bila MASIH nama bawaan lama
--    ("Paguyuban Warga Digital"); nama yang sudah Anda ubah sendiri tidak disentuh.
-- =====================================================================
alter table public.pengaturan
  alter column nama_paguyuban set default 'Paguyuban Vila Gading Royal';

update public.pengaturan
   set nama_paguyuban = 'Paguyuban Vila Gading Royal'
 where nama_paguyuban = 'Paguyuban Warga Digital';

-- #####################################################################
-- ##  BERKAS: 19-nonaktifkan-batas-login.sql
-- #####################################################################
-- =====================================================================
-- 19-nonaktifkan-batas-login.sql
-- MENONAKTIFKAN pembatasan percobaan login (penundaan setelah PIN salah) lewat satu saklar.
-- Alasan: banyak warga belum terbiasa; salah PIN harus boleh dicoba lagi tanpa ditunda.
--
-- Cara kerja: kolom status_keamanan.batas_login_aktif (bawaan MATI = false).
--  * Saat mati: cek_batas_login selalu {tunggu:0, sisa:5}; catat_login_gagal tidak mencatat/menunda/memberi
--    peringatan; hook_verifikasi_pin (bila sempat diaktifkan di Supabase) selalu "continue" tanpa mencatat.
--    Pesan di halaman masuk menjadi "Nomor HP atau PIN salah." (tanpa hitungan sisa percobaan).
--  * Semua penundaan yang masih berjalan dihapus sekarang juga.
--  * Mekanisme 14 tetap ada (tidak dihapus). Untuk menyalakan lagi, jalankan:
--        update public.status_keamanan set batas_login_aktif = true where id = 1;
--
-- Aman dijalankan ulang. Tidak menghapus data warga. Jalankan setelah 14-batas-percobaan-login.sql.
-- CATATAN: bila hook "Password verification attempt" sudah diaktifkan di Supabase, boleh dibiarkan (kini tidak
-- berbuat apa-apa) atau dimatikan di Dashboard > Authentication > Hooks.
-- =====================================================================

alter table public.status_keamanan add column if not exists batas_login_aktif boolean not null default false;

-- Hapus semua penundaan/penghitung yang sedang berjalan (hanya saat saklar mati, agar aman diulang)
delete from public.percobaan_login
 where not coalesce((select batas_login_aktif from public.status_keamanan where id = 1), false);

create or replace function public._batas_login_aktif()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select batas_login_aktif from public.status_keamanan where id = 1), false)
$$;
revoke execute on function public._batas_login_aktif() from public, anon, authenticated;

create or replace function public._sisa_tunggu(p_hp text)
returns integer language sql stable security definer set search_path = '' as $$
  select case when not public._batas_login_aktif() then 0 else
    coalesce((select greatest(0, ceil(extract(epoch from (terkunci_sampai - now()))))::integer
                from public.percobaan_login where nomor_hp = p_hp), 0) end
$$;

create or replace function public.cek_batas_login(p_hp text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp); v_n integer;
begin
  if v_hp is null or not public._batas_login_aktif() then return jsonb_build_object('tunggu', 0, 'sisa', 5); end if;
  select case when gagal_terakhir_at < now() - interval '6 hours' then 0 else gagal_beruntun end into v_n
    from public.percobaan_login where nomor_hp = v_hp;
  return jsonb_build_object('tunggu', public._sisa_tunggu(v_hp), 'sisa', greatest(0, 5 - coalesce(v_n, 0)));
end $$;

create or replace function public.catat_login_gagal(p_hp text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hp text := public.normalisasi_hp(p_hp);
begin
  if v_hp is null or not public._batas_login_aktif() then return jsonb_build_object('tunggu', 0, 'sisa', 5); end if;
  if exists (select 1 from public.percobaan_login where nomor_hp = v_hp and hook_at > now() - interval '15 seconds') then
    return public.cek_batas_login(v_hp);
  end if;
  return public._login_gagal(v_hp, false);
end $$;

create or replace function public.status_penegakan_login()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v timestamptz;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  select hook_login_terakhir_at into v from public.status_keamanan where id = 1;
  return jsonb_build_object('hook_aktif', v is not null and v > now() - interval '30 days', 'terakhir', v,
                            'batas_aktif', public._batas_login_aktif());
end $$;

create or replace function public.hook_verifikasi_pin(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hp text; v_valid boolean := coalesce((event ->> 'valid')::boolean, false); v_tunggu integer; v_r jsonb;
begin
  if not public._batas_login_aktif() then return jsonb_build_object('decision', 'continue'); end if;
  select k.nomor_hp into v_hp from public.warga_kontak k where k.warga_id = (event ->> 'user_id')::uuid;
  if v_hp is null then return jsonb_build_object('decision', 'continue'); end if;

  update public.status_keamanan set hook_login_terakhir_at = now() where id = 1;

  if v_valid then
    v_tunggu := public._sisa_tunggu(v_hp);
    if v_tunggu > 0 then
      update public.percobaan_login set hook_at = now() where nomor_hp = v_hp;
      return jsonb_build_object('decision', 'reject', 'should_logout_user', false,
        'message', 'Terlalu banyak percobaan salah. Coba lagi dalam ' || case when v_tunggu < 60 then v_tunggu || ' detik' else ceil(v_tunggu / 60.0)::integer || ' menit' end || '.');
    end if;
    delete from public.percobaan_login where nomor_hp = v_hp;
    return jsonb_build_object('decision', 'continue');
  end if;

  v_r := public._login_gagal(v_hp, true);
  if (v_r ->> 'tunggu')::integer > 0 then
    return jsonb_build_object('decision', 'reject', 'should_logout_user', false,
      'message', 'PIN salah. Terlalu banyak percobaan; coba lagi dalam ' || case when (v_r ->> 'tunggu')::integer < 60 then (v_r ->> 'tunggu') || ' detik' else ceil((v_r ->> 'tunggu')::integer / 60.0)::integer || ' menit' end || '.');
  end if;
  return jsonb_build_object('decision', 'continue');
end $$;

-- Hak eksekusi (create or replace mempertahankan hak lama; ditegaskan ulang agar jelas)
revoke execute on function public._sisa_tunggu(text) from public, anon, authenticated;
revoke execute on function public.hook_verifikasi_pin(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_verifikasi_pin(jsonb) to supabase_auth_admin;
  end if;
end $$;

-- #####################################################################
-- ##  BERKAS: 20-perbaikan-warga-massal.sql
-- #####################################################################
-- =====================================================================
-- 20-perbaikan-warga-massal.sql
-- Perbaikan data warga secara massal (dari berkas CSV atau "Ubah massal" di tabel) dan
-- penggantian nomor HP login yang ikut memperbarui akun masuk.
--
-- 1. ubah_hp_warga(id, hp, domain)  : admin mengganti nomor HP seorang warga. Selain warga_kontak,
--    email akun login (hp@domain) ikut diganti, sehingga warga bisa langsung masuk dengan nomor baru.
--    Sebelumnya hanya warga_kontak yang berubah, sehingga login dengan nomor baru gagal.
-- 2. perbarui_warga_massal(rows, domain) : memperbarui banyak warga sekaligus. Tiap baris berisi `id`
--    dan HANYA kolom yang ingin diubah (kolom yang tidak dikirim tidak disentuh). Satu baris yang gagal
--    tidak membatalkan baris lain. Kewenangan sama dengan form Ubah anggota:
--      * admin                         : semua warga, termasuk nomor HP dan tautan foto
--      * ketua / wakil / sekretaris    : semua warga kecuali akun admin; tanpa HP dan foto
--      * humas                         : hanya warga di jalannya; tanpa HP dan foto
--    Hasil: {diubah, dilewati:[{baris,nama,alasan}]}
--
-- Aman dijalankan ulang. Tidak mengubah/menghapus data. Prasyarat: 01-19.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ganti nomor HP login (internal + versi admin)
-- ---------------------------------------------------------------------
create or replace function public._ganti_hp_warga(p_id uuid, p_hp text, p_domain text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hp text := public.normalisasi_hp(p_hp);
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_lama text;
  v_email_lama text;
  v_email_baru text;
begin
  if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;
  select nomor_hp into v_lama from public.warga_kontak where warga_id = p_id;
  if not found then raise exception 'Data kontak warga tidak ditemukan'; end if;
  if v_lama is not distinct from v_hp then return; end if;

  v_email_baru := v_hp || '@' || v_domain;
  if exists (select 1 from public.warga_kontak where nomor_hp = v_hp and warga_id <> p_id)
     or exists (select 1 from auth.users where lower(email) = v_email_baru and id <> p_id) then
    raise exception 'Nomor HP % sudah dipakai warga lain', v_hp;
  end if;

  -- Akun yang masuk dengan nomor HP memakai email <hp>@<domain>; akun lain (mis. Google) tidak diubah.
  select email into v_email_lama from auth.users where id = p_id;
  if v_lama is not null and lower(coalesce(v_email_lama, '')) = v_lama || '@' || v_domain then
    update auth.users set email = v_email_baru, updated_at = now() where id = p_id;
    update auth.identities
       set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email_baru), updated_at = now()
     where user_id = p_id and provider = 'email';
  end if;

  perform set_config('app.bypass', '1', true);
  update public.warga_kontak set nomor_hp = v_hp where warga_id = p_id;
  perform set_config('app.bypass', '', true);
end $$;
revoke execute on function public._ganti_hp_warga(uuid, text, text) from public, anon, authenticated;

create or replace function public.ubah_hp_warga(p_id uuid, p_hp text, p_domain text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nomor HP hanya bisa diubah admin' using errcode = '42501'; end if;
  perform public._ganti_hp_warga(p_id, p_hp, p_domain);
end $$;
revoke execute on function public.ubah_hp_warga(uuid, text, text) from public, anon;
grant execute on function public.ubah_hp_warga(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Pembaruan massal
-- ---------------------------------------------------------------------
create or replace function public.perbarui_warga_massal(p_rows jsonb, p_domain text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_diubah integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_admin boolean := public.is_admin();
  w public.warga;
  k public.warga_kontak;
  v_nama_baris text;
  v_nama text; v_blok text; v_no text; v_gang uuid; v_gang_teks text; v_kerja text; v_kk boolean; v_status text; v_foto text;
  v_nikah text; v_anak text; v_hunian text; v_hp text; v_teks text;
  v_ada_kontak boolean;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if not (v_admin or public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0) then
    raise exception 'Hanya pengelola data warga yang dapat memperbarui data' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_nama_baris := coalesce(r ->> 'nama', '');
    begin
      if jsonb_typeof(r) <> 'object' or coalesce(r ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Kolom id tidak valid';
      end if;
      select * into w from public.warga where id = (r ->> 'id')::uuid for update;
      if not found then raise exception 'Warga tidak ditemukan (id mungkin sudah dihapus)'; end if;
      v_nama_baris := w.nama;

      -- Kewenangan (pemicu _warga_guard dan _kontak_guard tetap memeriksa ulang)
      if not v_admin then
        if w.id = auth.uid() then raise exception 'Data diri sendiri diubah lewat menu Profil'; end if;
        if w.role = 'admin' then raise exception 'Data admin hanya dapat diubah admin'; end if;
        if not public.bisa_kelola_gang(w.gang_id) then raise exception 'Warga ini di luar wilayah kewenangan Anda'; end if;
      end if;

      -- Nilai awal = data sekarang; hanya kolom yang dikirim yang diganti
      v_nama := w.nama; v_blok := w.blok; v_no := w.no_rumah; v_gang := w.gang_id; v_kerja := w.pekerjaan;
      v_kk := w.kepala_keluarga; v_status := w.status; v_foto := w.foto_path;
      select * into k from public.warga_kontak where warga_id = w.id;
      v_nikah := k.status_pernikahan; v_anak := k.jumlah_anak::text; v_hunian := k.status_hunian;
      v_ada_kontak := r ? 'status_pernikahan' or r ? 'jumlah_anak' or r ? 'status_hunian';

      if r ? 'nama' then
        v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
        if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      end if;
      if r ? 'blok' then
        v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
        if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok "%" tidak dikenal', v_blok; end if;
      end if;
      if r ? 'no_rumah' then
        v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
        if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid (maks. 10 karakter termasuk sub-blok)'; end if;
      end if;
      if r ? 'gang' then
        v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', '')), '');
        v_gang := null;
        if v_gang_teks is not null then
          select g.id into v_gang from public.gang g
           where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
           order by (g.blok is not null) desc limit 1;
          if v_gang is null then raise exception 'Jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
        end if;
      elsif v_blok is distinct from w.blok and v_gang is not null
            and exists (select 1 from public.gang g where g.id = v_gang and g.blok is not null and g.blok <> v_blok) then
        v_gang := null; -- pindah blok: jalan lama tidak berlaku lagi
      end if;
      if r ? 'pekerjaan' then v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60); end if;
      if r ? 'kepala_keluarga' then
        v_teks := lower(btrim(coalesce(r ->> 'kepala_keluarga', '')));
        v_kk := case when v_teks in ('ya', 'y', 'true', '1', 'kk') then true
                     when v_teks in ('tidak', 'n', 'false', '0', 'bukan') then false end;
        if v_kk is null then raise exception 'Kepala keluarga: isi ya atau tidak'; end if;
      end if;
      if r ? 'status' then
        v_status := lower(btrim(coalesce(r ->> 'status', '')));
        if v_status not in ('aktif', 'nonaktif') then raise exception 'Keanggotaan hanya bisa diubah menjadi aktif atau nonaktif'; end if;
        if v_status is distinct from w.status and w.status not in ('aktif', 'nonaktif') then
          raise exception 'Pendaftar yang belum disetujui diproses lewat menu Verifikasi anggota';
        end if;
        if v_status is distinct from w.status and w.id = auth.uid() then raise exception 'Status akun sendiri tidak dapat diubah'; end if;
      end if;
      if r ? 'foto' then
        v_teks := nullif(btrim(coalesce(r ->> 'foto', '')), '');
        if v_teks is not null and v_teks is distinct from w.foto_path then
          if not v_admin then raise exception 'Foto hanya bisa diubah admin'; end if;
          if v_teks !~* '^https://[^[:space:]]+$' or char_length(v_teks) > 480 then raise exception 'Tautan foto harus diawali https://'; end if;
          v_foto := v_teks;
        end if;
      end if;
      if r ? 'status_pernikahan' then
        v_nikah := case lower(btrim(coalesce(r ->> 'status_pernikahan', '')))
          when '' then null
          when 'belum_menikah' then 'belum_menikah' when 'belum menikah' then 'belum_menikah' when 'lajang' then 'belum_menikah' when 'belum kawin' then 'belum_menikah'
          when 'menikah' then 'menikah' when 'sudah menikah' then 'menikah' when 'kawin' then 'menikah'
          when 'cerai_hidup' then 'cerai_hidup' when 'cerai hidup' then 'cerai_hidup'
          when 'cerai_mati' then 'cerai_mati' when 'cerai mati' then 'cerai_mati'
          else 'x' end;
        if v_nikah = 'x' then raise exception 'Status pernikahan "%" tidak dikenal', r ->> 'status_pernikahan'; end if;
      end if;
      if r ? 'jumlah_anak' then
        v_anak := nullif(btrim(coalesce(r ->> 'jumlah_anak', '')), '');
        if v_anak is not null and (v_anak !~ '^[0-9]{1,2}$' or v_anak::integer > 30) then raise exception 'Jumlah anak harus angka 0-30'; end if;
      end if;
      if r ? 'status_hunian' then
        v_hunian := case lower(btrim(coalesce(r ->> 'status_hunian', '')))
          when '' then null
          when 'milik_sendiri' then 'milik_sendiri' when 'milik sendiri' then 'milik_sendiri' when 'milik' then 'milik_sendiri'
          when 'sendiri' then 'milik_sendiri' when 'pribadi' then 'milik_sendiri' when 'hak milik' then 'milik_sendiri'
          when 'kontrak' then 'kontrak' when 'kontrakan' then 'kontrak' when 'sewa' then 'kontrak' when 'sewa/kontrak' then 'kontrak' when 'kos' then 'kontrak'
          else 'x' end;
        if v_hunian = 'x' then raise exception 'Rumah ditempati "%" tidak dikenal (isi milik sendiri atau kontrak)', r ->> 'status_hunian'; end if;
      end if;

      -- Nomor HP: hanya admin; email login ikut diganti
      if r ? 'hp' and nullif(btrim(coalesce(r ->> 'hp', '')), '') is not null then
        v_hp := public.normalisasi_hp(r ->> 'hp');
        if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
        if v_hp is distinct from k.nomor_hp then
          if not v_admin then raise exception 'Nomor HP hanya bisa diubah admin'; end if;
          perform public._ganti_hp_warga(w.id, v_hp, p_domain);
        end if;
      end if;

      update public.warga
         set nama = v_nama, blok = v_blok, no_rumah = v_no, gang_id = v_gang, pekerjaan = v_kerja,
             kepala_keluarga = v_kk, status = v_status, foto_path = v_foto
       where id = w.id;
      if v_ada_kontak then
        update public.warga_kontak
           set status_pernikahan = v_nikah, jumlah_anak = v_anak::smallint, status_hunian = v_hunian
         where warga_id = w.id;
      end if;
      v_diubah := v_diubah + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', v_nama_baris, 'alasan', sqlerrm));
    end;
  end loop;

  if v_diubah > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'memperbarui ' || v_diubah || ' data warga', false);
  end if;
  return jsonb_build_object('diubah', v_diubah, 'dilewati', v_skip);
end $$;

revoke execute on function public.perbarui_warga_massal(jsonb, text) from public, anon;
grant execute on function public.perbarui_warga_massal(jsonb, text) to authenticated;

