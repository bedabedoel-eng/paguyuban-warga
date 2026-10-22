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
