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
