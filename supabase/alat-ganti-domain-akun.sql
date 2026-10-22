-- =====================================================================
-- Alat sekali pakai: ganti domain email internal akun nomor HP
--   dari  wargakoe.pages.dev   ke  wargavgr.pages.dev
--
-- Kapan dipakai: VITE_AUTH_EMAIL_DOMAIN di Cloudflare sudah diganti, tetapi
-- akun lama di Supabase masih memakai domain lama, sehingga warga dan admin
-- tidak bisa masuk ("nomor HP atau PIN salah").
--
-- Cara pakai (Supabase > SQL Editor):
--   1. Ganti dua nilai di bagian PENGATURAN bila domainnya berbeda.
--   2. Jalankan BAGIAN 1 saja (blok "pratinjau") untuk melihat jumlah akun.
--   3. Jalankan BAGIAN 2. Semua berhasil atau tidak ada yang berubah sama sekali.
--   4. Pastikan VITE_AUTH_EMAIL_DOMAIN di Cloudflare = domain baru, lalu Retry deployment.
-- PIN tidak berubah. Akun Google tidak disentuh. Aman dijalankan ulang.
-- =====================================================================

-- ---------- BAGIAN 1: pratinjau (tidak mengubah apa pun) ----------
with atur as (select 'wargakoe.pages.dev'::text as lama, 'wargavgr.pages.dev'::text as baru)
select
  (select count(*) from auth.users, atur where lower(email) like '%@' || lama)                as akun_domain_lama,
  (select count(*) from auth.users, atur where lower(email) like '%@' || baru)                as akun_domain_baru,
  (select count(*) from auth.users u, atur
    where lower(u.email) like '%@' || lama
      and exists (select 1 from auth.users x
                  where lower(x.email) = split_part(lower(u.email), '@', 1) || '@' || baru)) as bentrok,
  (select string_agg(u.email, ', ') from auth.users u, atur
    where lower(u.email) like '%@' || lama
      and exists (select 1 from auth.users x
                  where lower(x.email) = split_part(lower(u.email), '@', 1) || '@' || baru)) as daftar_bentrok;

-- ---------- BAGIAN 2: ganti domain ----------
do $$
declare
  -- PENGATURAN
  v_lama  text := 'wargakoe.pages.dev';
  v_baru  text := 'wargavgr.pages.dev';
  -- ---------
  v_bentrok text;
  v_n int;
begin
  v_lama := lower(btrim(v_lama)); v_baru := lower(btrim(v_baru));
  if v_lama = v_baru or v_baru !~ '^[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'Periksa pengaturan domain: lama=% baru=%', v_lama, v_baru;
  end if;

  -- Nomor yang sudah punya akun di domain baru (mis. didaftarkan ulang) harus dibereskan dulu
  select string_agg(u.email, ', ') into v_bentrok
  from auth.users u
  where lower(u.email) like '%@' || v_lama
    and exists (select 1 from auth.users x where lower(x.email) = split_part(lower(u.email), '@', 1) || '@' || v_baru);
  if v_bentrok is not null then
    raise exception 'Dibatalkan, tidak ada yang diubah. Nomor ini sudah punya akun di domain baru: %. Hapus akun duplikat di domain baru (Authentication > Users) lalu jalankan lagi.', v_bentrok;
  end if;

  update auth.users
     set email = split_part(lower(email), '@', 1) || '@' || v_baru, updated_at = now()
   where lower(email) like '%@' || v_lama;
  get diagnostics v_n = row_count;

  update auth.identities i
     set identity_data = coalesce(i.identity_data, '{}'::jsonb) || jsonb_build_object('email', u.email), updated_at = now()
    from auth.users u
   where i.user_id = u.id and i.provider = 'email'
     and lower(coalesce(i.identity_data ->> 'email', '')) like '%@' || v_lama;

  raise notice 'Selesai: % akun dipindah dari @% ke @%.', v_n, v_lama, v_baru;
end $$;

-- Periksa hasil: akun_domain_lama harus 0
select
  count(*) filter (where lower(email) like '%@wargakoe.pages.dev') as akun_domain_lama,
  count(*) filter (where lower(email) like '%@wargavgr.pages.dev') as akun_domain_baru
from auth.users;
