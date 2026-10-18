-- =====================================================================
-- 03-pin-angka.sql
-- Mengubah aturan kata sandi menjadi PIN angka minimal 6 digit
-- =====================================================================

-- 1. Warga mengubah PIN sendiri (wajib PIN/sandi lama)
create or replace function public.ubah_sandi(p_lama text, p_baru text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if coalesce(p_baru, '') !~ '^[0-9]{6,}$' then
    raise exception 'PIN baru harus berupa angka minimal 6 digit';
  end if;
  select encrypted_password into v_hash from auth.users where id = auth.uid();
  if coalesce(v_hash, '') <> '' and v_hash <> extensions.crypt(coalesce(p_lama, ''), v_hash) then
    raise exception 'PIN lama salah';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_baru, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = auth.uid();
end $$;

-- 2. Admin mengatur ulang PIN warga yang lupa
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
  perform public._aktivitas(auth.uid(), 'anggota', 'mengatur ulang PIN seorang warga', false);
end $$;

grant execute on function public.ubah_sandi(text, text) to authenticated;
grant execute on function public.reset_sandi_warga(uuid, text) to authenticated;