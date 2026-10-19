-- =====================================================================
-- 08 — Perbaikan prioritas: daftar periode IPL, total transaksi, dan LOG AUDIT kas
-- Jalankan di Supabase > SQL Editor SETELAH 07-update-sensus-blok-ipl.sql. Aman dijalankan ulang.
--
-- Isi:
--   1. periode_ipl_tersedia()   daftar periode IPL langsung dari database (bukan 5000 baris ke peramban)
--   2. ringkasan_transaksi()    jumlah baris + total masuk/keluar sesuai filter, tidak terpotong paginasi
--   3. audit_log + trigger      semua perubahan transaksi kas (tambah/ubah/hapus) dan penghapusan tagihan IPL
--   4. pulihkan_transaksi()     mengembalikan transaksi kas manual yang terhapus (tetap lewat aturan persetujuan Ketua)
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
