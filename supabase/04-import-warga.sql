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
