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
