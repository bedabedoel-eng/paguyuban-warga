-- =====================================================================
-- 20-perbaikan-warga-massal.sql
-- Perbaikan data warga secara massal (dari berkas CSV atau "Ubah massal" di tabel) dan
-- penggantian nomor HP login yang ikut memperbarui akun masuk.
--
-- 1. ubah_hp_warga(id, hp, domain)  : admin mengganti nomor HP seorang warga. Selain warga_kontak,
--    email akun login (hp@domain) ikut diganti, sehingga warga bisa langsung masuk dengan nomor baru.
--    Sebelumnya hanya warga_kontak yang berubah, sehingga login dengan nomor baru gagal.
-- 2. perbarui_warga_massal(rows, domain) : memperbarui banyak warga sekaligus. Tiap baris berisi `id`
--    dan HANYA kolom yang ingin diubah (kolom yang tidak dikirim tidak disentuh). Satu baris yang gagal
--    tidak membatalkan baris lain. Kewenangan sama dengan form Ubah anggota:
--      * admin                         : semua warga, termasuk nomor HP dan tautan foto
--      * ketua / wakil / sekretaris    : semua warga kecuali akun admin; tanpa HP dan foto
--      * humas                         : hanya warga di jalannya; tanpa HP dan foto
--    Hasil: {diubah, dilewati:[{baris,nama,alasan}]}
--
-- Aman dijalankan ulang. Tidak mengubah/menghapus data. Prasyarat: 01-19.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ganti nomor HP login (internal + versi admin)
-- ---------------------------------------------------------------------
create or replace function public._ganti_hp_warga(p_id uuid, p_hp text, p_domain text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hp text := public.normalisasi_hp(p_hp);
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_lama text;
  v_email_lama text;
  v_email_baru text;
begin
  if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
  if v_domain !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then raise exception 'Domain akun tidak valid'; end if;
  select nomor_hp into v_lama from public.warga_kontak where warga_id = p_id;
  if not found then raise exception 'Data kontak warga tidak ditemukan'; end if;
  if v_lama is not distinct from v_hp then return; end if;

  v_email_baru := v_hp || '@' || v_domain;
  if exists (select 1 from public.warga_kontak where nomor_hp = v_hp and warga_id <> p_id)
     or exists (select 1 from auth.users where lower(email) = v_email_baru and id <> p_id) then
    raise exception 'Nomor HP % sudah dipakai warga lain', v_hp;
  end if;

  -- Akun yang masuk dengan nomor HP memakai email <hp>@<domain>; akun lain (mis. Google) tidak diubah.
  select email into v_email_lama from auth.users where id = p_id;
  if v_lama is not null and lower(coalesce(v_email_lama, '')) = v_lama || '@' || v_domain then
    update auth.users set email = v_email_baru, updated_at = now() where id = p_id;
    update auth.identities
       set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email_baru), updated_at = now()
     where user_id = p_id and provider = 'email';
  end if;

  perform set_config('app.bypass', '1', true);
  update public.warga_kontak set nomor_hp = v_hp where warga_id = p_id;
  perform set_config('app.bypass', '', true);
end $$;
revoke execute on function public._ganti_hp_warga(uuid, text, text) from public, anon, authenticated;

create or replace function public.ubah_hp_warga(p_id uuid, p_hp text, p_domain text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nomor HP hanya bisa diubah admin' using errcode = '42501'; end if;
  perform public._ganti_hp_warga(p_id, p_hp, p_domain);
end $$;
revoke execute on function public.ubah_hp_warga(uuid, text, text) from public, anon;
grant execute on function public.ubah_hp_warga(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Pembaruan massal
-- ---------------------------------------------------------------------
create or replace function public.perbarui_warga_massal(p_rows jsonb, p_domain text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_diubah integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_admin boolean := public.is_admin();
  w public.warga;
  k public.warga_kontak;
  v_nama_baris text;
  v_nama text; v_blok text; v_no text; v_gang uuid; v_gang_teks text; v_kerja text; v_kk boolean; v_status text; v_foto text;
  v_nikah text; v_anak text; v_hunian text; v_hp text; v_teks text;
  v_ada_kontak boolean;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  if not (v_admin or public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0) then
    raise exception 'Hanya pengelola data warga yang dapat memperbarui data' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Data harus berupa daftar'; end if;
  if jsonb_array_length(p_rows) > 500 then raise exception 'Maksimal 500 baris per proses'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_nama_baris := coalesce(r ->> 'nama', '');
    begin
      if jsonb_typeof(r) <> 'object' or coalesce(r ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Kolom id tidak valid';
      end if;
      select * into w from public.warga where id = (r ->> 'id')::uuid for update;
      if not found then raise exception 'Warga tidak ditemukan (id mungkin sudah dihapus)'; end if;
      v_nama_baris := w.nama;

      -- Kewenangan (pemicu _warga_guard dan _kontak_guard tetap memeriksa ulang)
      if not v_admin then
        if w.id = auth.uid() then raise exception 'Data diri sendiri diubah lewat menu Profil'; end if;
        if w.role = 'admin' then raise exception 'Data admin hanya dapat diubah admin'; end if;
        if not public.bisa_kelola_gang(w.gang_id) then raise exception 'Warga ini di luar wilayah kewenangan Anda'; end if;
      end if;

      -- Nilai awal = data sekarang; hanya kolom yang dikirim yang diganti
      v_nama := w.nama; v_blok := w.blok; v_no := w.no_rumah; v_gang := w.gang_id; v_kerja := w.pekerjaan;
      v_kk := w.kepala_keluarga; v_status := w.status; v_foto := w.foto_path;
      select * into k from public.warga_kontak where warga_id = w.id;
      v_nikah := k.status_pernikahan; v_anak := k.jumlah_anak::text; v_hunian := k.status_hunian;
      v_ada_kontak := r ? 'status_pernikahan' or r ? 'jumlah_anak' or r ? 'status_hunian';

      if r ? 'nama' then
        v_nama := left(btrim(coalesce(r ->> 'nama', '')), 80);
        if char_length(v_nama) < 2 then raise exception 'Nama minimal 2 huruf'; end if;
      end if;
      if r ? 'blok' then
        v_blok := upper(btrim(coalesce(r ->> 'blok', '')));
        if not exists (select 1 from public.blok where kode = v_blok) then raise exception 'Blok "%" tidak dikenal', v_blok; end if;
      end if;
      if r ? 'no_rumah' then
        v_no := upper(btrim(coalesce(r ->> 'no_rumah', '')));
        if not public.nomor_rumah_valid(v_no) then raise exception 'Nomor rumah tidak valid (maks. 10 karakter termasuk sub-blok)'; end if;
      end if;
      if r ? 'gang' then
        v_gang_teks := nullif(btrim(coalesce(r ->> 'gang', '')), '');
        v_gang := null;
        if v_gang_teks is not null then
          select g.id into v_gang from public.gang g
           where lower(btrim(g.nama)) = lower(v_gang_teks) and (g.blok is null or g.blok = v_blok)
           order by (g.blok is not null) desc limit 1;
          if v_gang is null then raise exception 'Jalan "%" belum terdaftar di Blok %', v_gang_teks, v_blok; end if;
        end if;
      elsif v_blok is distinct from w.blok and v_gang is not null
            and exists (select 1 from public.gang g where g.id = v_gang and g.blok is not null and g.blok <> v_blok) then
        v_gang := null; -- pindah blok: jalan lama tidak berlaku lagi
      end if;
      if r ? 'pekerjaan' then v_kerja := left(nullif(btrim(coalesce(r ->> 'pekerjaan', '')), ''), 60); end if;
      if r ? 'kepala_keluarga' then
        v_teks := lower(btrim(coalesce(r ->> 'kepala_keluarga', '')));
        v_kk := case when v_teks in ('ya', 'y', 'true', '1', 'kk') then true
                     when v_teks in ('tidak', 'n', 'false', '0', 'bukan') then false end;
        if v_kk is null then raise exception 'Kepala keluarga: isi ya atau tidak'; end if;
      end if;
      if r ? 'status' then
        v_status := lower(btrim(coalesce(r ->> 'status', '')));
        if v_status not in ('aktif', 'nonaktif') then raise exception 'Keanggotaan hanya bisa diubah menjadi aktif atau nonaktif'; end if;
        if v_status is distinct from w.status and w.status not in ('aktif', 'nonaktif') then
          raise exception 'Pendaftar yang belum disetujui diproses lewat menu Verifikasi anggota';
        end if;
        if v_status is distinct from w.status and w.id = auth.uid() then raise exception 'Status akun sendiri tidak dapat diubah'; end if;
      end if;
      if r ? 'foto' then
        v_teks := nullif(btrim(coalesce(r ->> 'foto', '')), '');
        if v_teks is not null and v_teks is distinct from w.foto_path then
          if not v_admin then raise exception 'Foto hanya bisa diubah admin'; end if;
          if v_teks !~* '^https://[^[:space:]]+$' or char_length(v_teks) > 480 then raise exception 'Tautan foto harus diawali https://'; end if;
          v_foto := v_teks;
        end if;
      end if;
      if r ? 'status_pernikahan' then
        v_nikah := case lower(btrim(coalesce(r ->> 'status_pernikahan', '')))
          when '' then null
          when 'belum_menikah' then 'belum_menikah' when 'belum menikah' then 'belum_menikah' when 'lajang' then 'belum_menikah' when 'belum kawin' then 'belum_menikah'
          when 'menikah' then 'menikah' when 'sudah menikah' then 'menikah' when 'kawin' then 'menikah'
          when 'cerai_hidup' then 'cerai_hidup' when 'cerai hidup' then 'cerai_hidup'
          when 'cerai_mati' then 'cerai_mati' when 'cerai mati' then 'cerai_mati'
          else 'x' end;
        if v_nikah = 'x' then raise exception 'Status pernikahan "%" tidak dikenal', r ->> 'status_pernikahan'; end if;
      end if;
      if r ? 'jumlah_anak' then
        v_anak := nullif(btrim(coalesce(r ->> 'jumlah_anak', '')), '');
        if v_anak is not null and (v_anak !~ '^[0-9]{1,2}$' or v_anak::integer > 30) then raise exception 'Jumlah anak harus angka 0-30'; end if;
      end if;
      if r ? 'status_hunian' then
        v_hunian := case lower(btrim(coalesce(r ->> 'status_hunian', '')))
          when '' then null
          when 'milik_sendiri' then 'milik_sendiri' when 'milik sendiri' then 'milik_sendiri' when 'milik' then 'milik_sendiri'
          when 'sendiri' then 'milik_sendiri' when 'pribadi' then 'milik_sendiri' when 'hak milik' then 'milik_sendiri'
          when 'kontrak' then 'kontrak' when 'kontrakan' then 'kontrak' when 'sewa' then 'kontrak' when 'sewa/kontrak' then 'kontrak' when 'kos' then 'kontrak'
          else 'x' end;
        if v_hunian = 'x' then raise exception 'Rumah ditempati "%" tidak dikenal (isi milik sendiri atau kontrak)', r ->> 'status_hunian'; end if;
      end if;

      -- Nomor HP: hanya admin; email login ikut diganti
      if r ? 'hp' and nullif(btrim(coalesce(r ->> 'hp', '')), '') is not null then
        v_hp := public.normalisasi_hp(r ->> 'hp');
        if v_hp is null then raise exception 'Nomor HP tidak valid'; end if;
        if v_hp is distinct from k.nomor_hp then
          if not v_admin then raise exception 'Nomor HP hanya bisa diubah admin'; end if;
          perform public._ganti_hp_warga(w.id, v_hp, p_domain);
        end if;
      end if;

      update public.warga
         set nama = v_nama, blok = v_blok, no_rumah = v_no, gang_id = v_gang, pekerjaan = v_kerja,
             kepala_keluarga = v_kk, status = v_status, foto_path = v_foto
       where id = w.id;
      if v_ada_kontak then
        update public.warga_kontak
           set status_pernikahan = v_nikah, jumlah_anak = v_anak::smallint, status_hunian = v_hunian
         where warga_id = w.id;
      end if;
      v_diubah := v_diubah + 1;
    exception when others then
      perform set_config('app.bypass', '', true);
      v_skip := v_skip || jsonb_build_array(jsonb_build_object('baris', i, 'nama', v_nama_baris, 'alasan', sqlerrm));
    end;
  end loop;

  if v_diubah > 0 then
    perform public._aktivitas(auth.uid(), 'anggota', 'memperbarui ' || v_diubah || ' data warga', false);
  end if;
  return jsonb_build_object('diubah', v_diubah, 'dilewati', v_skip);
end $$;

revoke execute on function public.perbarui_warga_massal(jsonb, text) from public, anon;
grant execute on function public.perbarui_warga_massal(jsonb, text) to authenticated;
