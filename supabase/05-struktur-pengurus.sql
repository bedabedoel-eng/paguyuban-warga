-- =====================================================================
-- 05-struktur-pengurus.sql
-- Struktur organisasi paguyuban & hak akses berbasis peran (RBAC):
--   Ketua · Wakil Ketua · Sekretaris · Bendahara · Humas Gang · Seksi
-- Juga menambah: persetujuan Ketua untuk pengeluaran kas besar,
-- arsip administrasi (surat & notulen), serta pengumuman/kegiatan per gang.
--
-- Jalankan SETELAH 01, 02, 03, dan 04. Aman dijalankan ulang.
-- Tidak menghapus data. Kolom baru diisi otomatis dari data lama
-- (mis. jabatan "Bendahara" -> peran 'bendahara').
-- Gang = Blok (tabel public.blok). Humas Gang A mengelola warga Blok A.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KOLOM & TABEL BARU
-- ---------------------------------------------------------------------

-- 1a. Peran terstruktur & wilayah gang pada pengurus
alter table public.pengurus add column if not exists peran text;
alter table public.pengurus add column if not exists wilayah_blok text references public.blok(kode) on update cascade on delete set null;

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
declare v_kode text;
begin
  if new.peran is null then new.peran := public._peran_dari_jabatan(new.jabatan); end if;
  -- "Humas Gang A" / "Humas Blok B" -> wilayah otomatis bila belum diisi
  if new.peran = 'humas' and new.wilayah_blok is null then
    v_kode := upper((regexp_match(new.jabatan, '(?:gang|blok)\s*([A-Za-z0-9]{1,5})', 'i'))[1]);
    if v_kode is not null and exists (select 1 from public.blok b where b.kode = v_kode) then
      new.wilayah_blok := v_kode;
    end if;
  end if;
  if new.peran <> 'humas' then new.wilayah_blok := null; end if;
  return new;
end $$;

drop trigger if exists pengurus_isi_peran on public.pengurus;
create trigger pengurus_isi_peran before insert or update on public.pengurus
  for each row execute function public._pengurus_isi_peran();

-- Isi data lama (trigger di atas yang menghitung)
update public.pengurus set peran = null where peran is null;
alter table public.pengurus alter column peran set not null;
create index if not exists pengurus_peran_idx on public.pengurus (peran) where aktif;

-- 1b. Pengumuman & kegiatan khusus gang (null = untuk semua warga)
alter table public.pengumuman add column if not exists blok text references public.blok(kode) on update cascade on delete set null;
alter table public.kegiatan add column if not exists blok text references public.blok(kode) on update cascade on delete set null;

-- 1c. Persetujuan pengeluaran kas
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

-- 1d. Arsip administrasi (Sekretaris): surat masuk/keluar & notulen
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

-- 1e. Jenis notifikasi & aktivitas baru (menambah pilihan, tidak menghapus)
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

-- Gang yang dipegang humas yang sedang masuk
create or replace function public.humas_blok() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct p.wilayah_blok), '{}')
  from public.pengurus p join public.warga w on w.id = p.warga_id
  where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
    and w.role in ('pengurus', 'admin') and p.peran = 'humas' and p.wilayah_blok is not null
$$;

-- Kelola anggota & informasi di wilayah: pimpinan & sekretaris (semua gang), humas (gangnya)
create or replace function public.bisa_kelola_wilayah(p_blok text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or public.punya_peran(array['ketua', 'wakil_ketua', 'sekretaris'])
      or (p_blok is not null and p_blok = any (public.humas_blok()))
$$;

-- Tangani aspirasi: pimpinan (semua) & humas (gangnya)
create or replace function public.bisa_kelola_laporan(p_blok text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_pimpinan() or (p_blok is not null and p_blok = any (public.humas_blok()))
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
    'humas', cardinality(public.humas_blok()) > 0,
    'wilayah', to_jsonb(public.humas_blok()),
    'peran', to_jsonb(p.peran),
    'kelola_anggota', public.bisa_kelola_wilayah(null),
    'kelola_info', public.bisa_kelola_wilayah(null) or cardinality(public.humas_blok()) > 0,
    'kelola_laporan', public.is_pimpinan() or cardinality(public.humas_blok()) > 0,
    'kelola_dokumen', public.bisa_kelola_dokumen(),
    'kelola_pengurus', public.is_ketua(),
    'setujui_kas', public.is_ketua(),
    'lihat_kas_detail', public.bisa_lihat_kas_detail()
  ) from p
$$;

-- ---------------------------------------------------------------------
-- 3. NOTIFIKASI TERARAH
-- ---------------------------------------------------------------------

-- Kirim ke admin + pengurus dengan peran tertentu (+ humas gang p_blok bila 'humas' disertakan)
create or replace function public._notif_peran(p_peran text[], p_blok text, p_judul text, p_isi text, p_jenis text, p_tautan text)
returns void language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(distinct w.id) into ids from public.warga w
  where w.status = 'aktif' and w.id is distinct from auth.uid()
    and (w.role = 'admin' or exists (
      select 1 from public.pengurus p where p.warga_id = w.id and p.aktif and w.role in ('pengurus', 'admin')
        and p.peran = any (p_peran)
        and (p.peran <> 'humas' or (p_blok is not null and p.wilayah_blok = p_blok))));
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
  v_nama text; v_blok text; v_no text; v_hp text;
begin
  v_nama := left(btrim(coalesce(m ->> 'nama', m ->> 'full_name', m ->> 'name', '')), 80);
  if char_length(v_nama) < 2 then v_nama := 'Warga Baru'; end if;
  v_blok := upper(btrim(coalesce(m ->> 'blok', '')));
  if not exists (select 1 from public.blok b where b.kode = v_blok) then v_blok := null; end if;
  v_no := nullif(btrim(coalesce(m ->> 'no_rumah', '')), '');
  if v_no !~ '^[0-9A-Za-z-]{1,6}$' then v_no := null; end if;
  v_hp := public.normalisasi_hp(m ->> 'nomor_hp');

  insert into public.warga (id, nama, blok, no_rumah) values (new.id, v_nama, v_blok, v_no)
  on conflict (id) do nothing;
  insert into public.warga_kontak (warga_id, nomor_hp, email)
  values (new.id, v_hp, case when v_provider = 'email' then null else new.email end)
  on conflict (warga_id) do nothing;

  if coalesce(current_setting('app.import', true), '') <> '1' then
    perform public._notif_peran(array['ketua', 'wakil_ketua', 'sekretaris', 'humas'], v_blok,
      'Pendaftaran anggota baru', v_nama || coalesce(' (Blok ' || v_blok || ')', '') || ' menunggu verifikasi', 'akun', '/admin/verifikasi');
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
      if old.status = 'aktif' and (new.blok is distinct from old.blok or new.no_rumah is distinct from old.no_rumah) then
        raise exception 'Perubahan blok/nomor rumah hanya oleh pengurus' using errcode = '42501';
      end if;
    else
      if not (public.bisa_kelola_wilayah(old.blok) and public.bisa_kelola_wilayah(new.blok)) then
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

-- 4b. Pengumuman baru -> warga sasaran (semua atau satu gang)
create or replace function public._pengumuman_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.warga
  where status = 'aktif' and id is distinct from new.dibuat_oleh and (new.blok is null or blok = new.blok);
  if ids is not null then
    perform public._notif(ids, case when new.blok is null then 'Pengumuman baru: ' else 'Info Gang ' || new.blok || ': ' end || new.judul,
      coalesce(new.ringkasan, left(new.isi, 120)), 'pengumuman', '/pengumuman/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'pengumuman', 'membuat pengumuman ' || new.judul, new.blok is null);
  return new;
end $$;

-- 4c. Kegiatan baru -> warga sasaran
create or replace function public._kegiatan_baru() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from public.warga
  where status = 'aktif' and id is distinct from new.dibuat_oleh and (new.blok is null or blok = new.blok);
  if ids is not null then
    perform public._notif(ids, 'Kegiatan mendatang: ' || new.judul,
      to_char(new.mulai at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' · ' || new.lokasi, 'kegiatan', '/kegiatan/' || new.id);
  end if;
  perform public._aktivitas(new.dibuat_oleh, 'kegiatan', 'menambahkan kegiatan ' || new.judul, new.blok is null);
  return new;
end $$;

-- 4d. Laporan: diteruskan ke pimpinan & humas gang pelapor
create or replace function public._laporan_notif() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_nama text; v_blok text;
begin
  if tg_op = 'INSERT' then
    select nama, blok into v_nama, v_blok from public.warga where id = new.pelapor_id;
    perform public._notif_peran(array['ketua', 'wakil_ketua', 'humas'], v_blok, 'Laporan baru: ' || new.judul,
      coalesce(v_nama, 'Warga') || coalesce(' (Blok ' || v_blok || ')', '') || ' mengirim laporan', 'laporan', '/admin/laporan');
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
declare v_kelola boolean := public.bisa_kelola_laporan(public.blok_warga(old.pelapor_id));
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
  if not public.bisa_kelola_wilayah(w.blok) then raise exception 'Pendaftar ini di luar wilayah Anda' using errcode = '42501'; end if;
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
  if not public.bisa_kelola_wilayah(w.blok) then raise exception 'Pendaftar ini di luar wilayah Anda' using errcode = '42501'; end if;
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
declare v_periode date; r jsonb; v_wil text[] := public.humas_blok();
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
    'anggota_menunggu', case when public.bisa_kelola_wilayah(null) or cardinality(v_wil) > 0 then
       (select count(*) from public.warga where status = 'menunggu' and public.bisa_kelola_wilayah(blok)) end,
    'pembayaran_menunggu', case when public.is_bendahara() then (select count(*) from public.pembayaran_ipl where status = 'menunggu') end,
    'laporan_baru', case when public.is_pimpinan() or cardinality(v_wil) > 0 then
       (select count(*) from public.laporan l where l.status in ('baru', 'diproses') and public.bisa_kelola_laporan(public.blok_warga(l.pelapor_id))) end,
    'pengeluaran_menunggu', case when public.bisa_lihat_kas_detail() then (select count(*) from public.transaksi_kas where status = 'menunggu') end,
    'pengeluaran_menunggu_nominal', case when public.bisa_lihat_kas_detail() then (select coalesce(sum(jumlah), 0) from public.transaksi_kas where status = 'menunggu') end,
    'dokumen_bulan_ini', case when public.bisa_kelola_dokumen() then
       (select count(*) from public.dokumen where date_trunc('month', tanggal) = date_trunc('month', now() at time zone 'Asia/Jakarta')) end,
    'wilayah', case when cardinality(v_wil) > 0 then (
       select jsonb_agg(jsonb_build_object(
         'blok', b,
         'warga', (select count(*) from public.warga w where w.status = 'aktif' and w.blok = b),
         'rumah', (select count(*) from public.rumah r where r.blok = b and r.status = 'dihuni'),
         'menunggu', (select count(*) from public.warga w where w.status = 'menunggu' and w.blok = b),
         'laporan_aktif', (select count(*) from public.laporan l join public.warga w on w.id = l.pelapor_id where w.blok = b and l.status in ('baru', 'diproses')),
         'ipl_lunas', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where r.blok = b and t.periode = v_periode and t.status = 'lunas'),
         'ipl_belum', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where r.blok = b and t.periode = v_periode and t.status <> 'lunas')
       )) from unnest(v_wil) as b) end
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

-- ---------------------------------------------------------------------
-- 6. HAK EKSEKUSI
-- ---------------------------------------------------------------------
revoke execute on function public._notif_peran(text[], text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public._notif_pengurus(text, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function public._user_baru() from public, anon, authenticated;
revoke execute on function public._peran_dari_jabatan(text) from public, anon;
grant execute on function public.punya_peran(text[]) to authenticated;
grant execute on function public.is_ketua() to authenticated;
grant execute on function public.is_pimpinan() to authenticated;
grant execute on function public.is_sekretaris() to authenticated;
grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.humas_blok() to authenticated;
grant execute on function public.bisa_kelola_wilayah(text) to authenticated;
grant execute on function public.bisa_kelola_laporan(text) to authenticated;
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

-- warga: anggota aktif saling melihat; pendaftar hanya oleh pengelola wilayahnya
drop policy if exists warga_baca on public.warga;
create policy warga_baca on public.warga for select to authenticated
  using (id = auth.uid() or (status = 'aktif' and public.is_aktif()) or public.bisa_kelola_wilayah(blok));
drop policy if exists warga_ubah_pengelola on public.warga;
create policy warga_ubah_pengelola on public.warga for update to authenticated
  using (id <> auth.uid() and public.bisa_kelola_wilayah(blok))
  with check (id <> auth.uid() and public.bisa_kelola_wilayah(blok));

-- kontak: pemilik, pengelola wilayah, bendahara (penagihan)
drop policy if exists kontak_baca on public.warga_kontak;
create policy kontak_baca on public.warga_kontak for select to authenticated
  using (warga_id = auth.uid() or public.is_bendahara() or public.bisa_kelola_wilayah(public.blok_warga(warga_id)));

-- pengurus: dikelola admin & ketua
drop policy if exists pengurus_kelola on public.pengurus;
create policy pengurus_kelola on public.pengurus for all to authenticated
  using (public.is_ketua()) with check (public.is_ketua());

-- pengumuman & kegiatan: sasaran semua warga atau satu gang
drop policy if exists pengumuman_baca on public.pengumuman;
create policy pengumuman_baca on public.pengumuman for select to authenticated
  using (public.is_aktif() and (blok is null or blok = public.blok_warga(auth.uid()) or public.bisa_kelola_wilayah(blok)));
drop policy if exists pengumuman_kelola on public.pengumuman;
create policy pengumuman_kelola on public.pengumuman for all to authenticated
  using (public.bisa_kelola_wilayah(blok)) with check (public.bisa_kelola_wilayah(blok));

drop policy if exists kegiatan_baca on public.kegiatan;
create policy kegiatan_baca on public.kegiatan for select to authenticated
  using (public.is_aktif() and (blok is null or blok = public.blok_warga(auth.uid()) or public.bisa_kelola_wilayah(blok)));
drop policy if exists kegiatan_kelola on public.kegiatan;
create policy kegiatan_kelola on public.kegiatan for all to authenticated
  using (public.bisa_kelola_wilayah(blok)) with check (public.bisa_kelola_wilayah(blok));
drop policy if exists peserta_batal on public.kegiatan_peserta;
create policy peserta_batal on public.kegiatan_peserta for delete to authenticated
  using (warga_id = auth.uid() or exists (select 1 from public.kegiatan k where k.id = kegiatan_id and public.bisa_kelola_wilayah(k.blok)));

-- laporan: pelapor, pimpinan, humas gang pelapor
drop policy if exists laporan_baca on public.laporan;
create policy laporan_baca on public.laporan for select to authenticated
  using (pelapor_id = auth.uid() or public.bisa_kelola_laporan(public.blok_warga(pelapor_id)));
drop policy if exists laporan_ubah on public.laporan;
create policy laporan_ubah on public.laporan for update to authenticated
  using (pelapor_id = auth.uid() or public.bisa_kelola_laporan(public.blok_warga(pelapor_id)))
  with check (pelapor_id = auth.uid() or public.bisa_kelola_laporan(public.blok_warga(pelapor_id)));
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
      or exists (select 1 from public.warga w where w.id::text = (storage.foldername(name))[2] and public.bisa_kelola_laporan(w.blok))))
  ));
drop policy if exists "pw konten tulis" on storage.objects;
create policy "pw konten tulis" on storage.objects for insert to authenticated
  with check (bucket_id = 'konten' and (
    ((storage.foldername(name))[1] = 'avatar' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'laporan' and (storage.foldername(name))[2] = auth.uid()::text and public.is_aktif())
    or ((storage.foldername(name))[1] in ('pengumuman', 'kegiatan') and (public.bisa_kelola_wilayah(null) or cardinality(public.humas_blok()) > 0))
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
