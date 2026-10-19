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
