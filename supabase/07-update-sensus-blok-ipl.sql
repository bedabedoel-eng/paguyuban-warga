-- =====================================================================
-- 07-update-sensus-blok-ipl.sql
-- Jalankan SETELAH 01 s.d. 06. Aman dijalankan ulang, tidak menghapus data.
--
-- Isi pembaruan:
--  1. Data sensus warga: status pernikahan + jumlah anak (di warga_kontak, data pribadi)
--  2. Foto profil boleh berupa tautan (https) selain unggahan
--  3. Pengurus per blok (kolom pengurus.wilayah_blok):
--       - IPL (tagihan, bukti transfer, rincian di kas, statistik) hanya terlihat
--         oleh pengurus blok yang bersangkutan
--       - Pengumuman & kegiatan: pengurus blok hanya dapat menulis untuk bloknya
--     wilayah_blok kosong = pengurus semua blok (perilaku lama, tidak berubah).
--  4. Import warga: kolom opsional status_pernikahan, jumlah_anak, foto
--
-- Catatan: bila 05 pernah dijalankan ulang, jalankan 07 lagi sesudahnya.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SENSUS & FOTO
-- ---------------------------------------------------------------------
-- Data sensus disimpan di warga_kontak (data pribadi): hanya pemilik, bendahara,
-- dan pengurus yang berwenang atas warga tersebut yang dapat membacanya.
alter table public.warga_kontak add column if not exists status_pernikahan text;
alter table public.warga_kontak add column if not exists jumlah_anak smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kontak_status_pernikahan_check') then
    alter table public.warga_kontak add constraint kontak_status_pernikahan_check
      check (status_pernikahan is null or status_pernikahan in ('belum_menikah', 'menikah', 'cerai_hidup', 'cerai_mati'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kontak_jumlah_anak_check') then
    alter table public.warga_kontak add constraint kontak_jumlah_anak_check
      check (jumlah_anak is null or jumlah_anak between 0 and 30);
  end if;
end $$;

-- Jumlah anak hanya relevan bila sudah/pernah menikah
create or replace function public._kontak_sensus() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status_pernikahan is null or new.status_pernikahan = 'belum_menikah' then
    new.jumlah_anak := null;
  end if;
  return new;
end $$;
drop trigger if exists kontak_sensus on public.warga_kontak;
create trigger kontak_sensus before insert or update on public.warga_kontak
  for each row execute function public._kontak_sensus();

-- Nomor HP tetap hanya diubah admin. Pengurus berwenang boleh melengkapi data sensus
-- warga di wilayahnya, tetapi tidak email atau pengaturan tampil milik warga lain.
create or replace function public._kontak_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.bypass', true), '') <> '1' and not public.is_admin() then
    if new.nomor_hp is distinct from old.nomor_hp then
      raise exception 'Nomor HP dipakai untuk login dan hanya bisa diubah admin' using errcode = '42501';
    end if;
    if old.warga_id <> auth.uid() and (new.email is distinct from old.email
        or new.tampilkan_hp is distinct from old.tampilkan_hp or new.tampilkan_email is distinct from old.tampilkan_email) then
      raise exception 'Hanya data sensus warga yang dapat diubah pengurus' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop policy if exists kontak_ubah on public.warga_kontak;
create policy kontak_ubah on public.warga_kontak for update to authenticated
  using (warga_id = auth.uid() or public.is_admin() or public.bisa_kelola_gang(public.gang_warga(warga_id)))
  with check (warga_id = auth.uid() or public.is_admin() or public.bisa_kelola_gang(public.gang_warga(warga_id)));

-- Foto profil: path storage atau tautan https (batas panjang dinaikkan menjadi 500)
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.warga'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%foto_path%' loop
    execute format('alter table public.warga drop constraint %I', c.conname);
  end loop;
  alter table public.warga add constraint warga_foto_path_check check (char_length(foto_path) <= 500);
end $$;

-- Tautan foto harus https
create or replace function public._warga_foto() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.foto_path ~* '^https?:' and new.foto_path !~* '^https://[^[:space:]]+$' then
    raise exception 'Tautan foto harus diawali https://';
  end if;
  return new;
end $$;
drop trigger if exists warga_sensus on public.warga;
drop function if exists public._warga_sensus();
drop trigger if exists warga_foto on public.warga;
create trigger warga_foto before insert or update on public.warga
  for each row execute function public._warga_foto();

-- ---------------------------------------------------------------------
-- 2. PENGURUS PER BLOK
-- ---------------------------------------------------------------------
-- Tanpa "on delete set null": blok yang masih punya pengurus tidak bisa dihapus,
-- agar pengurus blok tidak tiba-tiba menjadi pengurus semua blok.
alter table public.pengurus add column if not exists wilayah_blok text references public.blok(kode) on update cascade;

create or replace function public._pengurus_isi_peran() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.peran is null then new.peran := public._peran_dari_jabatan(new.jabatan); end if;
  if new.peran = 'humas' and new.wilayah_gang is null then
    new.wilayah_gang := public._gang_dari_teks(new.jabatan);
  end if;
  if new.peran <> 'humas' then new.wilayah_gang := null; end if;
  -- wilayah blok hanya untuk peran inti (Ketua, Wakil, Sekretaris, Bendahara)
  if new.peran not in ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara') then new.wilayah_blok := null; end if;
  return new;
end $$;

-- Daftar blok yang boleh dikelola pengguna untuk peran tertentu.
-- Berisi '*' bila semua blok (admin, atau pengurus tanpa wilayah blok).
create or replace function public.wilayah_blok_peran(p_peran text[]) returns text[]
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then array['*']
    else coalesce((
      select array_agg(distinct coalesce(p.wilayah_blok, '*'))
      from public.pengurus p join public.warga w on w.id = p.warga_id
      where p.warga_id = auth.uid() and p.aktif and w.status = 'aktif'
        and w.role in ('pengurus', 'admin') and p.peran = any (p_peran)
    ), '{}'::text[]) end
$$;

-- Boleh melihat/mengelola IPL di blok ini? (admin, bendahara, ketua - sesuai wilayahnya)
create or replace function public.ipl_blok_boleh(p_blok text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce('*' = any (x.w) or (p_blok is not null and p_blok = any (x.w)), false)
  from (select public.wilayah_blok_peran(array['bendahara', 'ketua']) as w) x
$$;

-- Ketua tanpa wilayah blok (atau admin): boleh mengatur seluruh pengurus
create or replace function public.is_ketua_utama() returns boolean
language sql stable security definer set search_path = '' as $$
  select '*' = any (public.wilayah_blok_peran(array['ketua']))
$$;

-- Boleh menulis pengumuman/kegiatan untuk sasaran (blok / gang) ini?
-- Humas: gangnya. Ketua/Wakil/Sekretaris: seluruh blok, atau hanya blok wilayahnya.
create or replace function public.bisa_kelola_info(p_blok text, p_gang uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (p_gang is not null and p_gang = any (public.humas_gang()))
      or exists (
        select 1 from unnest(public.wilayah_blok_peran(array['ketua', 'wakil_ketua', 'sekretaris'])) b
        where b = '*' or b = coalesce(p_blok, (select g.blok from public.gang g where g.id = p_gang)))
$$;

create or replace function public.blok_rumah(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select r.blok from public.rumah r where r.id = p_id
$$;
create or replace function public.blok_tagihan(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select r.blok from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.id = p_id
$$;
create or replace function public.rumah_tagihan(p_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select t.rumah_id from public.tagihan_ipl t where t.id = p_id
$$;

-- ---------------------------------------------------------------------
-- 3. HAK AKSES UNTUK FRONTEND (menambah ipl_blok & info_blok)
-- ---------------------------------------------------------------------
create or replace function public.hak_saya() returns jsonb
language sql stable security definer set search_path = '' as $$
  with p as (
    select coalesce(array_agg(distinct pp.peran) filter (where pp.peran is not null), '{}') as peran
    from public.pengurus pp join public.warga w on w.id = pp.warga_id
    where pp.warga_id = auth.uid() and pp.aktif and w.status = 'aktif' and w.role in ('pengurus', 'admin')
  )
  select jsonb_build_object(
    'aktif', public.is_aktif(),
    'pengurus', public.is_pengurus(),
    'admin', public.is_admin(),
    'bendahara', public.is_bendahara(),
    'ketua', public.is_ketua(),
    'pimpinan', public.is_pimpinan(),
    'sekretaris', public.is_sekretaris(),
    'humas', cardinality(public.humas_gang()) > 0,
    'wilayah', to_jsonb(public.humas_gang()),
    'peran', to_jsonb(p.peran),
    'kelola_anggota', public.bisa_kelola_gang(null),
    'kelola_info', public.bisa_kelola_gang(null) or cardinality(public.humas_gang()) > 0,
    'kelola_laporan', public.is_pimpinan() or cardinality(public.humas_gang()) > 0,
    'kelola_dokumen', public.bisa_kelola_dokumen(),
    'kelola_pengurus', public.is_ketua_utama(),
    'setujui_kas', public.is_ketua(),
    'lihat_kas_detail', public.bisa_lihat_kas_detail(),
    -- wilayah blok pengurus: ['*'] = semua blok, atau daftar kode blok
    'ipl_blok', to_jsonb(public.wilayah_blok_peran(array['bendahara', 'ketua'])),
    'info_blok', to_jsonb(public.wilayah_blok_peran(array['ketua', 'wakil_ketua', 'sekretaris']))
  ) from p
$$;

-- ---------------------------------------------------------------------
-- 4. NOTIFIKASI: bisa dibatasi ke pengurus blok tertentu
-- ---------------------------------------------------------------------
drop function if exists public._notif_peran(text[], uuid, text, text, text, text);
create or replace function public._notif_peran(p_peran text[], p_gang uuid, p_judul text, p_isi text, p_jenis text, p_tautan text, p_blok text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare ids uuid[];
begin
  select array_agg(distinct w.id) into ids from public.warga w
  where w.status = 'aktif' and w.id is distinct from auth.uid()
    and (w.role = 'admin' or exists (
      select 1 from public.pengurus p where p.warga_id = w.id and p.aktif and w.role in ('pengurus', 'admin')
        and p.peran = any (p_peran)
        and (p.peran <> 'humas' or (p_gang is not null and p.wilayah_gang = p_gang))
        and (p_blok is null or p.peran = 'humas' or p.wilayah_blok is null or p.wilayah_blok = p_blok)));
  if ids is not null then
    insert into public.notifikasi (warga_id, judul, isi, jenis, tautan)
    select unnest(ids), left(p_judul, 160), left(p_isi, 300), p_jenis, p_tautan;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. IPL PER BLOK
-- ---------------------------------------------------------------------
-- Terbitkan tagihan hanya untuk blok yang menjadi kewenangan pengguna
create or replace function public.buat_tagihan_ipl(p_periode date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_periode date := date_trunc('month', p_periode)::date; v_jumlah integer; s public.pengaturan;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into s from public.pengaturan where id = 1;
  insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select r.id, v_periode, coalesce(r.tarif_ipl, s.tarif_ipl), v_periode + (s.jatuh_tempo_hari - 1)
  from public.rumah r where r.status = 'dihuni' and public.ipl_blok_boleh(r.blok)
  on conflict (rumah_id, periode) do nothing;
  get diagnostics v_jumlah = row_count;
  if v_jumlah > 0 then
    perform public._notif(
      (select array_agg(w.id) from public.warga w join public.tagihan_ipl t on t.rumah_id = w.rumah_id
        where t.periode = v_periode and w.status = 'aktif' and public.ipl_blok_boleh(w.blok)),
      'Tagihan IPL ' || public._nama_periode(v_periode), 'Tagihan IPL bulan ini sudah terbit', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'ipl', 'menerbitkan tagihan IPL ' || public._nama_periode(v_periode), false);
  end if;
  return v_jumlah;
end $$;

-- Bukti transfer: pemberitahuan hanya ke pengurus blok rumah tersebut
create or replace function public.kirim_pembayaran(p_tagihan uuid[], p_bukti_path text, p_catatan text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_rumah uuid := public.rumah_saya(); v_total integer; v_n integer; v_id uuid; v_nama text; v_blok text;
begin
  if v_rumah is null then raise exception 'Akun Anda belum terhubung ke rumah' using errcode = '42501'; end if;
  if coalesce(array_length(p_tagihan, 1), 0) = 0 then raise exception 'Pilih tagihan'; end if;
  if p_bukti_path is null or split_part(p_bukti_path, '/', 1) <> 'ipl' or split_part(p_bukti_path, '/', 2) <> auth.uid()::text then
    raise exception 'Bukti pembayaran tidak valid';
  end if;
  select count(*), sum(nominal) into v_n, v_total from public.tagihan_ipl
   where id = any (p_tagihan) and rumah_id = v_rumah and status = 'belum_bayar';
  if v_n <> array_length(p_tagihan, 1) then raise exception 'Ada tagihan yang tidak valid atau sudah dibayar'; end if;
  insert into public.pembayaran_ipl (warga_id, rumah_id, jumlah, bukti_path, catatan)
  values (auth.uid(), v_rumah, greatest(v_total, 1), p_bukti_path, left(p_catatan, 300)) returning id into v_id;
  update public.tagihan_ipl set status = 'menunggu_verifikasi', pembayaran_id = v_id where id = any (p_tagihan);
  select nama into v_nama from public.warga where id = auth.uid();
  v_blok := public.blok_rumah(v_rumah);
  perform public._notif_peran(array['bendahara', 'ketua'], null, 'Bukti pembayaran IPL baru',
    v_nama || ' mengunggah bukti pembayaran', 'ipl', '/admin/ipl', v_blok);
  perform public._aktivitas(auth.uid(), 'ipl', 'mengunggah bukti pembayaran IPL', false);
  return v_id;
end $$;

create or replace function public.verifikasi_pembayaran(p_id uuid, p_terima boolean, p_alasan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.pembayaran_ipl; t record; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into p from public.pembayaran_ipl where id = p_id for update;
  if not found or p.status <> 'menunggu' then raise exception 'Pembayaran tidak ditemukan atau sudah diverifikasi'; end if;
  if not public.ipl_blok_boleh(public.blok_rumah(p.rumah_id)) then
    raise exception 'IPL blok ini bukan kewenangan Anda' using errcode = '42501';
  end if;
  select kode into v_kode from public.rumah where id = p.rumah_id;
  if p_terima then
    update public.pembayaran_ipl set status = 'diterima', diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    for t in select * from public.tagihan_ipl where pembayaran_id = p_id loop
      update public.tagihan_ipl set status = 'lunas', dibayar_at = p.created_at, metode = 'transfer' where id = t.id;
      insert into public.transaksi_kas (jenis, kategori, jumlah, tanggal, keterangan, sumber, pembayaran_id, tagihan_id, bukti_path, dibuat_oleh)
      values ('pemasukan', 'Iuran IPL', t.nominal, (p.created_at at time zone 'Asia/Jakarta')::date,
              'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode, 'ipl', p_id, t.id, p.bukti_path, auth.uid())
      on conflict (tagihan_id) do nothing;
    end loop;
    perform public._notif(array[p.warga_id], 'Pembayaran IPL diverifikasi', 'Pembayaran Rp ' || p.jumlah || ' telah diterima', 'ipl', '/ipl');
    perform public._aktivitas(auth.uid(), 'keuangan', 'menyetujui pembayaran IPL ' || v_kode, false);
  else
    update public.pembayaran_ipl set status = 'ditolak', alasan_tolak = left(nullif(btrim(p_alasan), ''), 300),
           diverifikasi_oleh = auth.uid(), diverifikasi_at = now() where id = p_id;
    update public.tagihan_ipl set status = 'belum_bayar', pembayaran_id = null where pembayaran_id = p_id;
    perform public._notif(array[p.warga_id], 'Bukti pembayaran IPL ditolak', coalesce(p_alasan, 'Silakan unggah ulang bukti yang benar'), 'ipl', '/ipl');
  end if;
end $$;

create or replace function public.tandai_lunas_tunai(p_tagihan uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tagihan_ipl; v_kode text;
begin
  if not public.is_bendahara() then raise exception 'Hanya bendahara/ketua/admin' using errcode = '42501'; end if;
  select * into t from public.tagihan_ipl where id = p_tagihan for update;
  if not found or t.status = 'lunas' then raise exception 'Tagihan tidak ditemukan atau sudah lunas'; end if;
  if not public.ipl_blok_boleh(public.blok_rumah(t.rumah_id)) then
    raise exception 'IPL blok ini bukan kewenangan Anda' using errcode = '42501';
  end if;
  if t.status = 'menunggu_verifikasi' then raise exception 'Tagihan ini sedang menunggu verifikasi bukti transfer'; end if;
  select kode into v_kode from public.rumah where id = t.rumah_id;
  update public.tagihan_ipl set status = 'lunas', dibayar_at = now(), metode = 'tunai' where id = t.id;
  if t.nominal > 0 then
    insert into public.transaksi_kas (jenis, kategori, jumlah, keterangan, sumber, tagihan_id, dibuat_oleh)
    values ('pemasukan', 'Iuran IPL', t.nominal, 'IPL ' || public._nama_periode(t.periode) || ' · ' || v_kode || ' (tunai)', 'ipl', t.id, auth.uid());
  end if;
  perform public._notif((select array_agg(id) from public.warga where rumah_id = t.rumah_id),
    'Pembayaran IPL tercatat', 'IPL ' || public._nama_periode(t.periode) || ' lunas (tunai)', 'ipl', '/ipl');
end $$;

-- Grafik IPL bulanan: hanya blok yang boleh dilihat pengguna
create or replace function public.statistik_ipl_bulanan(p_tahun integer)
returns table (bulan integer, lunas bigint, belum bigint) language sql stable security definer set search_path = '' as $$
  select m.bulan,
         count(t.id) filter (where t.status = 'lunas'),
         count(t.id) filter (where t.status <> 'lunas')
  from generate_series(1, 12) as m(bulan)
  left join (
    select t0.* from public.tagihan_ipl t0 join public.rumah r on r.id = t0.rumah_id where public.ipl_blok_boleh(r.blok)
  ) t on extract(year from t.periode) = p_tahun and extract(month from t.periode) = m.bulan
  where public.is_aktif()
  group by m.bulan order by m.bulan
$$;

-- Ringkasan dasbor (IPL dibatasi per blok)
create or replace function public.statistik_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_periode date; r jsonb; v_wil uuid[] := public.humas_gang();
begin
  if not public.is_aktif() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select max(periode) into v_periode from public.tagihan_ipl where periode <= date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  if v_periode is null then select max(periode) into v_periode from public.tagihan_ipl; end if;
  select jsonb_build_object(
    'total_warga', (select count(*) from public.warga where status = 'aktif'),
    'kepala_keluarga', (select count(*) from public.warga where status = 'aktif' and kepala_keluarga),
    'pengurus_aktif', (select count(distinct p.warga_id) from public.pengurus p join public.warga w on w.id = p.warga_id where p.aktif and w.status = 'aktif'),
    'pengurus_total', (select count(distinct warga_id) from public.pengurus),
    'total_rumah', (select count(*) from public.rumah),
    'rumah_dihuni', (select count(*) from public.rumah where status = 'dihuni'),
    'periode_ipl', v_periode,
    -- IPL: hanya blok yang boleh dilihat pengguna (pengurus blok masing-masing)
    'ipl_terlihat', cardinality(public.wilayah_blok_peran(array['bendahara', 'ketua'])) > 0,
    'ipl_total_tagihan', (select coalesce(sum(t.nominal), 0) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and public.ipl_blok_boleh(r.blok)),
    'ipl_lunas', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and t.status = 'lunas' and public.ipl_blok_boleh(r.blok)),
    'ipl_belum', (select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = v_periode and t.status <> 'lunas' and public.ipl_blok_boleh(r.blok)),
    'saldo_kas', (select coalesce(sum(case when jenis = 'pemasukan' then jumlah else -jumlah end), 0) from public.transaksi_kas where status = 'disetujui'),
    'anggota_menunggu', case when public.bisa_kelola_gang(null) or cardinality(v_wil) > 0 then
       (select count(*) from public.warga where status = 'menunggu' and public.bisa_kelola_gang(gang_id)) end,
    'pembayaran_menunggu', case when public.is_bendahara() then (select count(*) from public.pembayaran_ipl p join public.rumah r on r.id = p.rumah_id where p.status = 'menunggu' and public.ipl_blok_boleh(r.blok)) end,
    'laporan_baru', case when public.is_pimpinan() or cardinality(v_wil) > 0 then
       (select count(*) from public.laporan l where l.status in ('baru', 'diproses') and public.bisa_tangani_aspirasi(public.gang_warga(l.pelapor_id))) end,
    'pengeluaran_menunggu', case when public.bisa_lihat_kas_detail() then (select count(*) from public.transaksi_kas where status = 'menunggu') end,
    'pengeluaran_menunggu_nominal', case when public.bisa_lihat_kas_detail() then (select coalesce(sum(jumlah), 0) from public.transaksi_kas where status = 'menunggu') end,
    'dokumen_bulan_ini', case when public.bisa_kelola_dokumen() then
       (select count(*) from public.dokumen where date_trunc('month', tanggal) = date_trunc('month', now() at time zone 'Asia/Jakarta')) end,
    'wilayah', case when cardinality(v_wil) > 0 then (
       select jsonb_agg(jsonb_build_object(
         'gang', g.id, 'nama', g.nama, 'blok', g.blok,
         'warga', (select count(*) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'rumah', (select count(distinct w.rumah_id) from public.warga w where w.status = 'aktif' and w.gang_id = g.id),
         'menunggu', (select count(*) from public.warga w where w.status = 'menunggu' and w.gang_id = g.id),
         'laporan_aktif', (select count(*) from public.laporan l join public.warga w on w.id = l.pelapor_id where w.gang_id = g.id and l.status in ('baru', 'diproses')),
         'ipl_lunas', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status = 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id)),
         'ipl_belum', (select count(*) from public.tagihan_ipl t where t.periode = v_periode and t.status <> 'lunas'
                         and t.rumah_id in (select w.rumah_id from public.warga w where w.status = 'aktif' and w.gang_id = g.id))
       ) order by g.urutan, g.nama) from public.gang g where g.id = any (v_wil)) end
  ) into r;
  return r;
end $$;

-- Import warga: kolom opsional status_pernikahan, jumlah_anak, foto (tautan https)
create or replace function public.import_warga(p_rows jsonb, p_domain text, p_pin text default '123456')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  i integer := 0;
  v_dibuat integer := 0;
  v_skip jsonb := '[]'::jsonb;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_nama text; v_hp text; v_blok text; v_no text; v_kerja text; v_kk boolean; v_email text; v_id uuid;
  v_gang_teks text; v_gang uuid; v_nikah text; v_anak text; v_foto text;
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

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now(),
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

-- ---------------------------------------------------------------------
-- 6. KEBIJAKAN AKSES (RLS)
-- ---------------------------------------------------------------------
-- Rumah, tagihan, dan pembayaran IPL: pengurus blok masing-masing
drop policy if exists rumah_kelola on public.rumah;
create policy rumah_kelola on public.rumah for all to authenticated
  using (public.ipl_blok_boleh(blok)) with check (public.ipl_blok_boleh(blok));

drop policy if exists tagihan_baca on public.tagihan_ipl;
create policy tagihan_baca on public.tagihan_ipl for select to authenticated
  using (rumah_id = public.rumah_saya() or public.ipl_blok_boleh(public.blok_rumah(rumah_id)));
drop policy if exists tagihan_kelola on public.tagihan_ipl;
create policy tagihan_kelola on public.tagihan_ipl for all to authenticated
  using (public.ipl_blok_boleh(public.blok_rumah(rumah_id))) with check (public.ipl_blok_boleh(public.blok_rumah(rumah_id)));
drop policy if exists pembayaran_baca on public.pembayaran_ipl;
create policy pembayaran_baca on public.pembayaran_ipl for select to authenticated
  using (warga_id = auth.uid() or rumah_id = public.rumah_saya() or public.ipl_blok_boleh(public.blok_rumah(rumah_id)));

-- Kas: catatan IPL per rumah hanya untuk pemilik rumah & pengurus blok itu.
-- Saldo dan ringkasan kas tetap terbuka untuk semua warga (fungsi ringkasan_kas).
drop policy if exists kas_baca on public.transaksi_kas;
create policy kas_baca on public.transaksi_kas for select to authenticated
  using (public.is_aktif()
    and (status = 'disetujui' or public.bisa_lihat_kas_detail())
    and (sumber <> 'ipl'
         or public.ipl_blok_boleh(public.blok_tagihan(tagihan_id))
         or (tagihan_id is not null and public.rumah_tagihan(tagihan_id) = public.rumah_saya())));

-- Bukti transfer IPL: pemilik atau pengurus blok warga tersebut
drop policy if exists "pw bukti baca" on storage.objects;
create policy "pw bukti baca" on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'ipl' and exists (
          select 1 from public.warga w
          where w.id::text = (storage.foldername(name))[2] and public.ipl_blok_boleh(w.blok)))
    or ((storage.foldername(name))[1] = 'kas' and public.is_aktif())
    or ((storage.foldername(name))[1] not in ('ipl', 'kas') and public.is_bendahara())));

-- Pengumuman & kegiatan: sasaran semua warga / satu blok / satu jalan.
-- Pengurus berwilayah blok hanya boleh menulis untuk bloknya.
drop policy if exists pengumuman_baca on public.pengumuman;
create policy pengumuman_baca on public.pengumuman for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_info(blok, gang_id)));
drop policy if exists pengumuman_kelola on public.pengumuman;
create policy pengumuman_kelola on public.pengumuman for all to authenticated
  using (public.bisa_kelola_info(blok, gang_id)) with check (public.bisa_kelola_info(blok, gang_id));

drop policy if exists kegiatan_baca on public.kegiatan;
create policy kegiatan_baca on public.kegiatan for select to authenticated
  using (public.is_aktif() and (
    ((blok is null or blok = public.blok_warga(auth.uid())) and (gang_id is null or gang_id = public.gang_warga(auth.uid())))
    or public.bisa_kelola_info(blok, gang_id)));
drop policy if exists kegiatan_kelola on public.kegiatan;
create policy kegiatan_kelola on public.kegiatan for all to authenticated
  using (public.bisa_kelola_info(blok, gang_id)) with check (public.bisa_kelola_info(blok, gang_id));

-- Susunan pengurus: admin & Ketua tanpa wilayah blok (agar Ketua blok tidak bisa
-- mengangkat dirinya atau orang lain menjadi pengurus semua blok)
drop policy if exists pengurus_kelola on public.pengurus;
create policy pengurus_kelola on public.pengurus for all to authenticated
  using (public.is_ketua_utama()) with check (public.is_ketua_utama());

-- ---------------------------------------------------------------------
-- 7. HAK EKSEKUSI
-- ---------------------------------------------------------------------
revoke execute on function public._notif_peran(text[], uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.wilayah_blok_peran(text[]) from public, anon;
revoke execute on function public.ipl_blok_boleh(text) from public, anon;
revoke execute on function public.is_ketua_utama() from public, anon;
revoke execute on function public.bisa_kelola_info(text, uuid) from public, anon;
revoke execute on function public.blok_rumah(uuid) from public, anon;
revoke execute on function public.blok_tagihan(uuid) from public, anon;
revoke execute on function public.rumah_tagihan(uuid) from public, anon;
grant execute on function public.wilayah_blok_peran(text[]) to authenticated;
grant execute on function public.ipl_blok_boleh(text) to authenticated;
grant execute on function public.is_ketua_utama() to authenticated;
grant execute on function public.bisa_kelola_info(text, uuid) to authenticated;
grant execute on function public.blok_rumah(uuid) to authenticated;
grant execute on function public.blok_tagihan(uuid) to authenticated;
grant execute on function public.rumah_tagihan(uuid) to authenticated;
grant execute on function public.buat_tagihan_ipl(date) to authenticated;
grant execute on function public.kirim_pembayaran(uuid[], text, text) to authenticated;
grant execute on function public.verifikasi_pembayaran(uuid, boolean, text) to authenticated;
grant execute on function public.tandai_lunas_tunai(uuid) to authenticated;
grant execute on function public.statistik_dashboard() to authenticated;
grant execute on function public.statistik_ipl_bulanan(integer) to authenticated;
grant execute on function public.hak_saya() to authenticated;
revoke execute on function public.import_warga(jsonb, text, text) from public, anon;
grant execute on function public.import_warga(jsonb, text, text) to authenticated;
