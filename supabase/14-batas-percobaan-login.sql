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
