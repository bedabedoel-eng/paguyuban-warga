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
