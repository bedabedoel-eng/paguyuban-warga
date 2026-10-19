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
