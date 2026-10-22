-- =====================================================================
-- Uji fitur & RLS per peran: IPL per blok, import warga, tambah warga manual, status hunian,
-- PIN awal acak, batas percobaan login, penanda pg_cron.
-- Peran yang diuji: admin, bendahara blok A, bendahara blok B, humas (jalan di blok A), warga biasa (A dan B).
-- Dijalankan oleh supabase/tests/jalankan.sh setelah uji-rls.sql, pada database LOKAL (jangan di produksi).
-- Seluruhnya di dalam satu transaksi lalu di-ROLLBACK.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
begin;

create schema uji;
grant usage on schema uji to public;

create function uji.sebagai(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end $$;
create function uji.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  execute 'set local role anon';
end $$;
create function uji.kembali() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create function uji.cek(p_kondisi boolean, p_nama text) returns void language plpgsql as $$
begin
  if p_kondisi is not true then raise exception 'GAGAL: %', p_nama; end if;
  raise notice 'lulus  - %', p_nama;
end $$;
create function uji.harus_gagal(p_sql text, p_nama text, p_kode text default null) returns void language plpgsql as $$
declare v_kode text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_kode = returned_sqlstate;
    if p_kode is not null and v_kode <> p_kode then
      raise exception 'GAGAL: % (ditolak dengan kode %, seharusnya %)', p_nama, v_kode, p_kode;
    end if;
    raise notice 'lulus  - % [%]', p_nama, v_kode;
    return;
  end;
  raise exception 'GAGAL: % (seharusnya ditolak, tetapi berhasil)', p_nama;
end $$;
-- Penampung hasil panggilan fungsi (agar bisa diperiksa sesudah kembali menjadi superuser)
create table uji.h (nama text primary key, j jsonb);
grant all on uji.h to public;

-- ---------------------------------------------------------------------
-- Data uji
-- ---------------------------------------------------------------------
insert into public.blok (kode, nama) values ('A', 'Blok A'), ('B', 'Blok B') on conflict do nothing;
insert into public.gang (id, nama, blok) values
  ('9a000000-0000-0000-0000-00000000000a', 'Jl. Uji A', 'A'),
  ('9a000000-0000-0000-0000-00000000000b', 'Jl. Uji B', 'B');

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('f0000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'admin@fitur.local',   '{"nama":"Admin Fitur"}'),
  ('f0000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'bendaa@fitur.local',  '{"nama":"Bendahara Blok A"}'),
  ('f0000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'bendab@fitur.local',  '{"nama":"Bendahara Blok B"}'),
  ('f0000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'humas@fitur.local',   '{"nama":"Humas Jalan A"}'),
  ('f0000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'wargaa@fitur.local',  '{"nama":"Warga A10","nomor_hp":"081200000010"}'),
  ('f0000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'wargab@fitur.local',  '{"nama":"Warga B10","nomor_hp":"081200000020"}'),
  ('f0000000-0000-0000-0000-0000000000d3', 'authenticated', 'authenticated', 'wargaa2@fitur.local', '{"nama":"Warga A11","nomor_hp":"081200000011"}');

update public.warga set status = 'aktif', role = 'admin',    blok = 'A', no_rumah = '1' where id = 'f0000000-0000-0000-0000-0000000000a1';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '2' where id = 'f0000000-0000-0000-0000-0000000000b1';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'B', no_rumah = '2' where id = 'f0000000-0000-0000-0000-0000000000b2';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '3', gang_id = '9a000000-0000-0000-0000-00000000000a' where id = 'f0000000-0000-0000-0000-0000000000c1';
update public.warga set status = 'aktif', blok = 'A', no_rumah = '10', gang_id = '9a000000-0000-0000-0000-00000000000a' where id = 'f0000000-0000-0000-0000-0000000000d1';
update public.warga set status = 'aktif', blok = 'B', no_rumah = '10', gang_id = '9a000000-0000-0000-0000-00000000000b' where id = 'f0000000-0000-0000-0000-0000000000d2';
update public.warga set status = 'aktif', blok = 'A', no_rumah = '11' where id = 'f0000000-0000-0000-0000-0000000000d3';

insert into public.pengurus (warga_id, jabatan, peran, wilayah_blok) values
  ('f0000000-0000-0000-0000-0000000000b1', 'Bendahara Blok A', 'bendahara', 'A'),
  ('f0000000-0000-0000-0000-0000000000b2', 'Bendahara Blok B', 'bendahara', 'B');
insert into public.pengurus (warga_id, jabatan, peran, wilayah_gang) values
  ('f0000000-0000-0000-0000-0000000000c1', 'Humas Jl. Uji A', 'humas', '9a000000-0000-0000-0000-00000000000a');

-- Tagihan: periode terbaru (A10, A11, B10) dan tunggakan lama (ketiganya)
insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select w.rumah_id, '2026-10-01', 100000, '2026-10-10' from public.warga w
   where w.id in ('f0000000-0000-0000-0000-0000000000d1', 'f0000000-0000-0000-0000-0000000000d2', 'f0000000-0000-0000-0000-0000000000d3');
insert into public.tagihan_ipl (rumah_id, periode, nominal, jatuh_tempo)
  select w.rumah_id, '2020-01-01', 100000, '2020-01-10' from public.warga w
   where w.id in ('f0000000-0000-0000-0000-0000000000d1', 'f0000000-0000-0000-0000-0000000000d2', 'f0000000-0000-0000-0000-0000000000d3');

-- =====================================================================
-- A. IPL PER BLOK
-- =====================================================================
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.cek((select count(*) from public.tagihan_ipl where periode = '2026-10-01') = 2, 'IPL: bendahara blok A melihat 2 tagihan (rumah blok A)');
select uji.cek((select count(*) from public.tagihan_ipl t where public.blok_rumah(t.rumah_id) = 'B') = 0, 'IPL: bendahara blok A tidak melihat tagihan blok B');
select uji.cek((select count(*) from public.tunggakan_ipl()) = 2 and (select count(*) from public.tunggakan_ipl() where blok = 'B') = 0, 'IPL: tunggakan bendahara blok A hanya blok A');
select uji.cek((select sum(belum) from public.statistik_ipl_bulanan(2026)) = 2, 'IPL: grafik bendahara blok A hanya menghitung blok A');
select uji.cek((public.hak_saya() -> 'ipl_blok') = '["A"]'::jsonb, 'IPL: hak_saya ipl_blok bendahara A = ["A"]');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000b2');
select uji.cek((select count(*) from public.tagihan_ipl where periode = '2026-10-01') = 1, 'IPL: bendahara blok B melihat 1 tagihan (rumah blok B)');
select uji.cek((select count(*) from public.tunggakan_ipl()) = 1 and (select blok from public.tunggakan_ipl() limit 1) = 'B', 'IPL: tunggakan bendahara blok B hanya blok B');
select uji.cek((public.hak_saya() -> 'ipl_blok') = '["B"]'::jsonb, 'IPL: hak_saya ipl_blok bendahara B = ["B"]');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((select count(*) from public.tagihan_ipl where periode = '2026-10-01') = 3, 'IPL: admin melihat tagihan semua blok');
select uji.cek((select sum(belum) from public.statistik_ipl_bulanan(2026)) = 3, 'IPL: grafik admin menghitung semua blok');
select uji.cek((public.hak_saya() -> 'ipl_blok') = '["*"]'::jsonb, 'IPL: hak_saya ipl_blok admin = ["*"]');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000c1');
select uji.cek((select count(*) from public.tagihan_ipl) = 0, 'IPL: humas tidak melihat tagihan IPL warga');
select uji.cek((select count(*) from public.tunggakan_ipl()) = 0, 'IPL: humas tidak melihat laporan tunggakan');
select uji.harus_gagal($q$select public.buat_tagihan_ipl('2026-11-01')$q$, 'IPL: humas tidak dapat menerbitkan tagihan', '42501');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.cek((select count(*) from public.tagihan_ipl where periode = '2026-10-01') = 1, 'IPL: warga A10 hanya melihat tagihan rumahnya');
select uji.harus_gagal($q$select public.buat_tagihan_ipl('2026-11-01')$q$, 'IPL: warga biasa tidak dapat menerbitkan tagihan', '42501');
select uji.harus_gagal($q$select public.tandai_lunas_tunai(id) from public.tagihan_ipl limit 1$q$, 'IPL: warga biasa tidak dapat menandai lunas tunai', '42501');
select uji.kembali();

-- Penerbitan tagihan per blok
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.cek(public.buat_tagihan_ipl('2026-11-15') = (select count(*) from public.rumah where blok = 'A' and status = 'dihuni')::int,
               'IPL: bendahara A menerbitkan tagihan hanya untuk rumah dihuni blok A');
select uji.kembali();
select uji.cek((select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = '2026-11-01' and r.blok = 'B') = 0,
               'IPL: penerbitan bendahara A tidak menyentuh blok B');
select uji.cek((select count(*) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where t.periode = '2026-11-01' and r.blok = 'A') > 0,
               'IPL: tagihan blok A periode November terbit');

-- Bendahara B tidak berwenang atas blok A
insert into uji.h select 'tagA', to_jsonb(t.id) from public.tagihan_ipl t join public.rumah r on r.id = t.rumah_id where r.blok = 'A' and t.periode = '2026-10-01' limit 1;
select uji.sebagai('f0000000-0000-0000-0000-0000000000b2');
select uji.harus_gagal(format($q$select public.tandai_lunas_tunai(%L)$q$, (select j #>> '{}' from uji.h where nama = 'tagA')), 'IPL: bendahara B tidak dapat melunasi tagihan blok A (di luar kewenangan blok)', '42501');
do $q$
declare n int;
begin
  update public.tagihan_ipl set nominal = 1 where public.blok_rumah(rumah_id) = 'A';
  get diagnostics n = row_count;
  perform uji.cek(n = 0, 'IPL: bendahara B tidak dapat mengubah tagihan blok A (0 baris)');
  delete from public.rumah where blok = 'A';
  get diagnostics n = row_count;
  perform uji.cek(n = 0, 'IPL: bendahara B tidak dapat menghapus rumah blok A (0 baris)');
end $q$;
select uji.harus_gagal($q$insert into public.pengurus (warga_id, jabatan, peran) values (auth.uid(), 'Ketua', 'ketua')$q$, 'IPL: bendahara tidak dapat mengangkat dirinya jadi pengurus lain', '42501');
select uji.kembali();

-- Bendahara A melunasi tunai tagihan A11 (lama), menghasilkan kas bersumber IPL
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select public.tandai_lunas_tunai((select t.id from public.tagihan_ipl t where t.periode = '2020-01-01' and t.rumah_id = (select rumah_id from public.warga where id = 'f0000000-0000-0000-0000-0000000000d3')));
select uji.kembali();
select uji.cek((select status from public.tagihan_ipl where periode = '2020-01-01' and rumah_id = (select rumah_id from public.warga where id = 'f0000000-0000-0000-0000-0000000000d3')) = 'lunas', 'IPL: bendahara A melunasi tunai tagihan blok A');

-- Alur bukti transfer: warga A10 kirim, hanya bendahara A (bukan B) diberi tahu dan berwenang memverifikasi
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
insert into uji.h select 'bayar', to_jsonb(public.kirim_pembayaran(
  array[(select t.id from public.tagihan_ipl t where t.periode = '2026-10-01' and t.rumah_id = public.rumah_saya())],
  'ipl/f0000000-0000-0000-0000-0000000000d1/bukti.jpg', 'uji'));
select uji.harus_gagal($q$select public.kirim_pembayaran(array[(select t.id from public.tagihan_ipl t limit 1)], 'ipl/f0000000-0000-0000-0000-0000000000d2/x.jpg')$q$, 'IPL: bukti dengan folder warga lain ditolak');
select uji.kembali();
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000b1' and judul = 'Bukti pembayaran IPL baru') = 1, 'IPL: bendahara blok A diberi tahu bukti baru');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000b2' and judul = 'Bukti pembayaran IPL baru') = 0, 'IPL: bendahara blok B TIDAK diberi tahu bukti blok A');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000a1' and judul = 'Bukti pembayaran IPL baru') = 1, 'IPL: admin diberi tahu bukti baru');

select uji.sebagai('f0000000-0000-0000-0000-0000000000b2');
select uji.cek((select count(*) from public.pembayaran_ipl) = 0, 'IPL: bendahara B tidak melihat pembayaran blok A');
select uji.harus_gagal(format($q$select public.verifikasi_pembayaran(%L, true)$q$, (select j #>> '{}' from uji.h where nama = 'bayar')), 'IPL: bendahara B tidak dapat memverifikasi pembayaran blok A', '42501');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000d2');
select uji.cek((select count(*) from public.pembayaran_ipl) = 0, 'IPL: warga B10 tidak melihat pembayaran warga A10');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select public.verifikasi_pembayaran((select (j #>> '{}')::uuid from uji.h where nama = 'bayar'), true);
select uji.kembali();
select uji.cek((select status from public.tagihan_ipl where periode = '2026-10-01' and rumah_id = (select rumah_id from public.warga where id = 'f0000000-0000-0000-0000-0000000000d1')) = 'lunas', 'IPL: bendahara A memverifikasi, tagihan lunas');
select uji.cek((select count(*) from public.transaksi_kas where sumber = 'ipl') = 2, 'IPL: kas bersumber IPL tercatat (tunai + transfer)');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000d1' and judul = 'Pembayaran IPL diverifikasi') = 1, 'IPL: warga diberi tahu pembayaran diverifikasi');

-- Visibilitas kas bersumber IPL mengikuti blok
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.cek((select count(*) from public.transaksi_kas where sumber = 'ipl') = 2, 'IPL: bendahara A melihat kas IPL blok A');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000b2');
select uji.cek((select count(*) from public.transaksi_kas where sumber = 'ipl') = 0, 'IPL: bendahara B tidak melihat kas IPL blok A');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.cek((select count(*) from public.transaksi_kas where sumber = 'ipl') = 1, 'IPL: warga A10 hanya melihat kas IPL rumahnya sendiri');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d2');
select uji.cek((select count(*) from public.transaksi_kas where sumber = 'ipl') = 0, 'IPL: warga B10 tidak melihat kas IPL rumah lain');
select uji.kembali();

-- =====================================================================
-- B. IMPORT WARGA (PIN acak, hunian dalam satu proses) - hanya admin
-- =====================================================================
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.harus_gagal($q$select public.import_warga('[{"nama":"Penyusup","hp":"081300000001","blok":"A","no_rumah":"900"}]', 'akun.uji.local')$q$, 'import: bendahara blok A ditolak', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000c1');
select uji.harus_gagal($q$select public.import_warga('[{"nama":"Penyusup","hp":"081300000001","blok":"A","no_rumah":"900"}]', 'akun.uji.local')$q$, 'import: humas ditolak', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.harus_gagal($q$select public.import_warga('[{"nama":"Penyusup","hp":"081300000001","blok":"A","no_rumah":"900"}]', 'akun.uji.local')$q$, 'import: warga biasa ditolak', '42501');
select uji.kembali();
select uji.anon();
select uji.harus_gagal($q$select public.import_warga('[{"nama":"Penyusup","hp":"081300000001","blok":"A","no_rumah":"900"}]', 'akun.uji.local')$q$, 'import: anon tidak punya hak eksekusi', '42501');
select uji.kembali();
select uji.cek((select count(*) from auth.users where email like '6281300000001@%') = 0, 'import: penolakan tidak membuat akun');

select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
insert into uji.h select 'imp', public.import_warga('[
  {"nama":"Budi Impor","hp":"0813-0000-0010","blok":"A","no_rumah":"30","gang":"jl. uji a","pekerjaan":"Guru","kepala_keluarga":"ya","status_pernikahan":"menikah","jumlah_anak":"2","status_hunian":"milik sendiri","foto":"https://contoh.id/budi.jpg"},
  {"nama":"Siti Impor","hp":"081300000011","blok":"A","no_rumah":"30","status_pernikahan":"menikah","jumlah_anak":"2","status_hunian":"Kontrakan"},
  {"nama":"Agus Impor","hp":"081300000012","blok":"B","no_rumah":"31","status_pernikahan":"belum menikah","jumlah_anak":"3","status_hunian":"sewa"},
  {"nama":"Dobel HP","hp":"081300000010","blok":"A","no_rumah":"32"},
  {"nama":"Blok Salah","hp":"081300000013","blok":"Z","no_rumah":"33"},
  {"nama":"Hunian Salah","hp":"081300000014","blok":"A","no_rumah":"34","status_hunian":"numpang"},
  {"nama":"Nikah Salah","hp":"081300000015","blok":"A","no_rumah":"35","status_pernikahan":"entah"},
  {"nama":"Anak Salah","hp":"081300000016","blok":"A","no_rumah":"36","status_pernikahan":"menikah","jumlah_anak":"31"},
  {"nama":"Foto Salah","hp":"081300000017","blok":"A","no_rumah":"37","foto":"http://contoh.id/x.jpg"},
  {"nama":"Jalan Salah","hp":"081300000018","blok":"A","no_rumah":"38","gang":"Jl. Tidak Ada"},
  {"nama":"Jalan Blok Lain","hp":"081300000019","blok":"A","no_rumah":"39","gang":"Jl. Uji B"},
  {"nama":"Telepon Salah","hp":"123","blok":"A","no_rumah":"40"},
  {"nama":"X","hp":"081300000020","blok":"A","no_rumah":"41"}
]', 'akun.uji.local', '123456');
select uji.kembali();

select uji.cek((select (j ->> 'dibuat')::int from uji.h where nama = 'imp') = 3, 'import: 3 baris valid dibuat, sisanya dilewati');
select uji.cek((select jsonb_array_length(j -> 'dilewati') from uji.h where nama = 'imp') = 10, 'import: 10 baris bermasalah dilewati, bukan menggagalkan semuanya');
select uji.cek((select jsonb_array_length(j -> 'akun') from uji.h where nama = 'imp') = 3, 'import: daftar akun berisi tepat baris yang dibuat');
select uji.cek((select bool_and(a ->> 'pin' ~ '^[1-9][0-9]{5}$') from uji.h, jsonb_array_elements(j -> 'akun') a where nama = 'imp'), 'import: PIN awal 6 angka dan tidak diawali nol');
select uji.cek((select count(*) from uji.h, jsonb_array_elements(j -> 'akun') a where nama = 'imp' and a ->> 'pin' = '123456') = 0, 'import: parameter PIN seragam 123456 diabaikan');
select uji.cek((select count(distinct a ->> 'pin') from uji.h, jsonb_array_elements(j -> 'akun') a where nama = 'imp') = 3, 'import: PIN tiap warga berbeda');
select uji.cek((select count(*) from uji.h, jsonb_array_elements(j -> 'akun') a join auth.users u on u.email = (a ->> 'hp') || '@akun.uji.local'
                 where nama = 'imp' and u.encrypted_password = extensions.crypt(a ->> 'pin', u.encrypted_password)) = 3, 'import: hash di auth.users cocok dengan PIN yang ditampilkan');
select uji.cek((select count(*) from auth.users u where u.email like '6281300000%' and u.encrypted_password = extensions.crypt('123456', u.encrypted_password)) = 0, 'import: tidak ada akun yang bisa masuk dengan 123456');
select uji.cek((select bool_and(w.status = 'aktif' and w.wajib_ganti_pin) from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp in ('6281300000010', '6281300000011', '6281300000012')), 'import: akun aktif dan wajib ganti PIN');
select uji.cek((select (select a ->> 'hp' from jsonb_array_elements(j -> 'akun') a where (a ->> 'nama') = 'Budi Impor') from uji.h where nama = 'imp') = '6281300000010', 'import: nomor HP dinormalkan (0813-0000-0010 -> 6281300000010)');
select uji.cek((select k.status_hunian from public.warga_kontak k where k.nomor_hp = '6281300000010') = 'milik_sendiri', 'hunian: "milik sendiri" tersimpan sebagai milik_sendiri dalam import');
select uji.cek((select k.status_hunian from public.warga_kontak k where k.nomor_hp = '6281300000011') = 'kontrak', 'hunian: "Kontrakan" tersimpan sebagai kontrak');
select uji.cek((select k.status_hunian from public.warga_kontak k where k.nomor_hp = '6281300000012') = 'kontrak', 'hunian: "sewa" tersimpan sebagai kontrak');
select uji.cek((select k.status_pernikahan || '|' || k.jumlah_anak from public.warga_kontak k where k.nomor_hp = '6281300000010') = 'menikah|2', 'import: status pernikahan dan jumlah anak tersimpan');
select uji.cek((select k.jumlah_anak is null from public.warga_kontak k where k.nomor_hp = '6281300000012'), 'import: jumlah anak dikosongkan bila belum menikah');
select uji.cek((select w.gang_id = '9a000000-0000-0000-0000-00000000000a' and w.foto_path = 'https://contoh.id/budi.jpg' and w.pekerjaan = 'Guru'
                  from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp = '6281300000010'), 'import: jalan (tanpa beda huruf besar), foto tautan, dan pekerjaan tersimpan');
select uji.cek((select w.kepala_keluarga from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp = '6281300000010'), 'import: baris bertanda "ya" menjadi kepala keluarga');
select uji.cek((select not w.kepala_keluarga from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp = '6281300000011'), 'import: anggota kedua di rumah yang sama bukan kepala keluarga');
select uji.cek((select count(*) from auth.users where email like '6281300000014@%' or email like '6281300000013@%' or email like '6281300000016@%') = 0, 'hunian/blok/anak tidak valid: akun tidak terbentuk sama sekali (satu baris, satu transaksi)');
select uji.cek((select count(*) from public.warga_kontak where nomor_hp = '6281300000014') = 0, 'hunian tidak valid: tidak ada data kontak setengah jadi');
select uji.cek((select (x ->> 'alasan') from uji.h, jsonb_array_elements(j -> 'dilewati') x where nama = 'imp' and (x ->> 'nama') = 'Hunian Salah') like 'Rumah ditempati "numpang"%', 'hunian tidak valid: alasan dilewati jelas (bahasa Indonesia)');
select uji.cek((select (x ->> 'alasan') from uji.h, jsonb_array_elements(j -> 'dilewati') x where nama = 'imp' and (x ->> 'nama') = 'Dobel HP') = 'Nomor HP sudah terdaftar', 'import: nomor HP ganda dilewati');
select uji.cek((select (x ->> 'baris')::int from uji.h, jsonb_array_elements(j -> 'dilewati') x where nama = 'imp' and (x ->> 'nama') = 'Jalan Blok Lain') = 11, 'import: nomor baris pada laporan dilewati sesuai urutan masukan');
select uji.cek((select count(*) from public.aktivitas a, uji.h, jsonb_array_elements(j -> 'akun') p where h.nama = 'imp' and (to_jsonb(a) - 'id' - 'pelaku_id' - 'created_at')::text like '%' || (p ->> 'pin') || '%') = 0, 'import: PIN tidak tercatat di log aktivitas');
select uji.cek((select count(*) from public.notifikasi n, uji.h, jsonb_array_elements(j -> 'akun') p where h.nama = 'imp' and (to_jsonb(n) - 'id' - 'warga_id' - 'created_at' - 'dibaca_at')::text like '%' || (p ->> 'pin') || '%') = 0, 'import: PIN tidak muncul di notifikasi');

-- Impor ulang berkas yang sama: semua dilewati, tidak ada akun ganda
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
insert into uji.h select 'imp2', public.import_warga('[{"nama":"Budi Impor","hp":"081300000010","blok":"A","no_rumah":"30"}]', 'akun.uji.local');
select uji.kembali();
select uji.cek((select (j ->> 'dibuat')::int = 0 and jsonb_array_length(j -> 'akun') = 0 from uji.h where nama = 'imp2'), 'import ulang: nomor yang sudah ada dilewati, tidak ada PIN baru');

-- Batas jumlah dan domain
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.harus_gagal($q$select public.import_warga((select jsonb_agg(jsonb_build_object('nama', 'X' || g)) from generate_series(1, 501) g), 'akun.uji.local')$q$, 'import: lebih dari 500 baris ditolak');
select uji.harus_gagal($q$select public.import_warga('[]', 'bukan domain')$q$, 'import: domain tidak valid ditolak');
select uji.kembali();

-- PIN acak: 25 akun dalam satu proses semuanya berbeda
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
insert into uji.h select 'imp25', public.import_warga(
  (select jsonb_agg(jsonb_build_object('nama', 'Massal ' || g, 'hp', '08140000' || lpad(g::text, 4, '0'), 'blok', 'A', 'no_rumah', (100 + g)::text)) from generate_series(1, 25) g), 'akun.uji.local');
select uji.kembali();
select uji.cek((select (j ->> 'dibuat')::int from uji.h where nama = 'imp25') = 25, 'PIN acak: 25 akun massal dibuat');
select uji.cek((select count(distinct a ->> 'pin') from uji.h, jsonb_array_elements(j -> 'akun') a where nama = 'imp25') >= 23, 'PIN acak: PIN tersebar (tidak seragam)');
select uji.cek((select count(*) from uji.h, jsonb_array_elements(j -> 'akun') a where nama = 'imp25' and (a ->> 'pin') ~ '^(\d)\1{5}$|^123456$|^654321$') = 0, 'PIN acak: tidak ada pola mudah tertebak');

-- =====================================================================
-- C. TAMBAH WARGA MANUAL (satu baris lewat fungsi yang sama)
-- =====================================================================
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
insert into uji.h select 'tambah', public.import_warga('[{"nama":"Warga Manual","hp":"81300000100","blok":"A","no_rumah":"50","gang":"Jl. Uji A","pekerjaan":"Wiraswasta","kepala_keluarga":"ya","status_hunian":"milik_sendiri"}]', 'akun.uji.local');
insert into uji.h select 'tambah2', public.import_warga('[{"nama":"Anggota Manual","hp":"81300000101","blok":"A","no_rumah":"50","kepala_keluarga":"tidak"}]', 'akun.uji.local');
insert into uji.h select 'tambah3', public.import_warga('[{"nama":"Tanpa Jalan","hp":"81300000102","blok":"A","no_rumah":"51","gang":"Jl. Hantu"}]', 'akun.uji.local');
select uji.kembali();
select uji.cek((select (j ->> 'dibuat')::int = 1 and (j -> 'akun' -> 0 ->> 'pin') ~ '^[1-9][0-9]{5}$' from uji.h where nama = 'tambah'), 'tambah manual: akun dibuat dengan PIN acak yang dikembalikan');
select uji.cek((select w.status = 'aktif' and w.wajib_ganti_pin and w.kepala_keluarga and w.gang_id is not null
                  from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp = '6281300000100'), 'tambah manual: aktif, wajib ganti PIN, kepala keluarga, jalan terisi');
select uji.cek((select k.status_hunian from public.warga_kontak k where k.nomor_hp = '6281300000100') = 'milik_sendiri', 'tambah manual: status hunian tersimpan');
select uji.cek((select not w.kepala_keluarga from public.warga w join public.warga_kontak k on k.warga_id = w.id where k.nomor_hp = '6281300000101'), 'tambah manual: "tidak" menjadi bukan kepala keluarga');
select uji.cek((select (j ->> 'dibuat')::int = 0 and (j -> 'dilewati' -> 0 ->> 'alasan') like 'Gang/jalan "Jl. Hantu" belum terdaftar%' from uji.h where nama = 'tambah3'), 'tambah manual: jalan tidak dikenal ditolak dengan alasan jelas');
select uji.cek((select count(*) from auth.users where email = '6281300000100@akun.uji.local') = 1, 'tambah manual: akun auth dibuat dengan email internal nomor HP');

-- =====================================================================
-- D. STATUS HUNIAN (kolom, constraint, dan hak ubah)
-- =====================================================================
select uji.harus_gagal($q$update public.warga_kontak set status_hunian = 'numpang' where nomor_hp = '6281200000010'$q$, 'hunian: nilai di luar milik_sendiri/kontrak ditolak constraint', '23514');

select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
update public.warga_kontak set status_hunian = 'kontrak' where warga_id = auth.uid();
select uji.cek((select status_hunian from public.warga_kontak where warga_id = auth.uid()) = 'kontrak', 'hunian: warga dapat mengisi hunian sendiri');
select uji.cek((select count(*) from public.warga_kontak where warga_id <> auth.uid()) = 0, 'hunian: warga biasa tidak membaca data kontak/hunian orang lain');
do $q$
declare n int;
begin
  update public.warga_kontak set status_hunian = 'milik_sendiri' where warga_id <> auth.uid();
  get diagnostics n = row_count;
  perform uji.cek(n = 0, 'hunian: warga tidak dapat mengubah hunian orang lain (0 baris)');
end $q$;
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000c1');
select uji.cek((select count(*) from public.warga_kontak where warga_id = 'f0000000-0000-0000-0000-0000000000d1') = 1, 'hunian: humas membaca data warga di jalannya');
select uji.cek((select count(*) from public.warga_kontak where warga_id = 'f0000000-0000-0000-0000-0000000000d2') = 0, 'hunian: humas tidak membaca data warga di jalan lain');
update public.warga_kontak set status_hunian = 'milik_sendiri' where warga_id = 'f0000000-0000-0000-0000-0000000000d1';
select uji.cek((select status_hunian from public.warga_kontak where warga_id = 'f0000000-0000-0000-0000-0000000000d1') = 'milik_sendiri', 'hunian: humas dapat melengkapi sensus warga di jalannya');
do $q$
declare n int;
begin
  update public.warga_kontak set status_hunian = 'kontrak' where warga_id = 'f0000000-0000-0000-0000-0000000000d2';
  get diagnostics n = row_count;
  perform uji.cek(n = 0, 'hunian: humas tidak dapat mengubah hunian warga jalan lain (0 baris)');
end $q$;
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
update public.warga_kontak set status_hunian = 'kontrak' where warga_id = 'f0000000-0000-0000-0000-0000000000d2';
select uji.cek((select status_hunian from public.warga_kontak where warga_id = 'f0000000-0000-0000-0000-0000000000d2') = 'kontrak', 'hunian: admin dapat mengubah hunian siapa pun');
select uji.kembali();

-- =====================================================================
-- E. BATAS PERCOBAAN LOGIN
-- (bawaan migrasi 19: MATI; di sini dinyalakan dulu untuk menguji mekanismenya, lalu diuji saat mati)
-- =====================================================================
select uji.cek(not public._batas_login_aktif(), 'login: bawaan saklar batas login MATI');
update public.status_keamanan set batas_login_aktif = true where id = 1;
select uji.anon();
select uji.cek((public.cek_batas_login('081200000010') ->> 'tunggu')::int = 0, 'login: awalnya tidak ditunda');
select public.catat_login_gagal('081200000010') from generate_series(1, 4);
select uji.cek((public.cek_batas_login('081200000010') ->> 'tunggu')::int = 0 and (public.cek_batas_login('081200000010') ->> 'sisa')::int = 1, 'login: 4 gagal masih tanpa tunda, sisa 1');
insert into uji.h select 'g5', public.catat_login_gagal('081200000010');
insert into uji.h select 'g6', public.catat_login_gagal('081200000010');
insert into uji.h select 'g7', public.catat_login_gagal('081200000010');
insert into uji.h select 'g8', public.catat_login_gagal('081200000010');
insert into uji.h select 'g9', public.catat_login_gagal('081200000010');
select uji.kembali();
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'g5') = 30, 'login: gagal ke-5 ditunda 30 detik');
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'g6') = 60, 'login: gagal ke-6 ditunda 1 menit');
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'g7') = 300, 'login: gagal ke-7 ditunda 5 menit');
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'g8') = 900, 'login: gagal ke-8 ditunda 15 menit');
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'g9') = 3600, 'login: gagal ke-9 ditunda 1 jam (batas atas)');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000a1' and judul like 'Login gagal berulang: Warga A10%') = 1, 'login: admin diberi peringatan saat gagal ke-5 (hanya sekali, tidak membanjiri)');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000d1' and judul like 'Login gagal berulang%') = 0, 'login: warga yang diserang tidak menerima peringatan pengurus');
select uji.cek((select position('PIN' in isi) > 0 and isi !~ '[0-9]{6}' from public.notifikasi where warga_id = 'f0000000-0000-0000-0000-0000000000a1' and judul like 'Login gagal berulang: Warga A10%'), 'login: isi peringatan tidak memuat PIN');

-- Nomor yang tidak terdaftar diperlakukan sama (tidak membocorkan keberadaan akun) dan tidak membuat peringatan
select uji.anon();
select public.catat_login_gagal('081299999999') from generate_series(1, 5);
select uji.cek((public.cek_batas_login('081299999999') ->> 'tunggu')::int = 30, 'login: nomor tak terdaftar ikut ditunda (tidak membocorkan keberadaan akun)');
select uji.cek((public.catat_login_gagal('abc') ->> 'tunggu')::int = 0, 'login: nomor tidak valid diabaikan tanpa galat');
select uji.harus_gagal($q$select * from public.percobaan_login$q$, 'login: anon tidak dapat membaca tabel percobaan', '42501');
select uji.harus_gagal($q$select public.buka_kunci_login(gen_random_uuid())$q$, 'login: anon tidak dapat membuka kunci', '42501');
select uji.harus_gagal($q$select public._login_gagal('081200000010')$q$, 'login: fungsi internal tidak dapat dipanggil anon', '42501');
select uji.harus_gagal($q$select public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d1","valid":false}')$q$, 'login: hook hanya untuk supabase_auth_admin (anon ditolak)', '42501');
select uji.kembali();
select uji.cek((select count(*) from public.notifikasi where judul like 'Login gagal berulang%' and isi like '%081299999999%') = 0, 'login: nomor tak terdaftar tidak memicu peringatan pengurus');

-- Hak per peran
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.cek((select count(*) from public.percobaan_login) = 0, 'login: warga biasa tidak membaca tabel percobaan');
select uji.harus_gagal($q$select public.buka_kunci_login('f0000000-0000-0000-0000-0000000000d1')$q$, 'login: warga biasa tidak dapat membuka kunci', '42501');
select uji.harus_gagal($q$select public.status_penegakan_login()$q$, 'login: warga biasa tidak dapat melihat status penegakan', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.cek((select count(*) from public.percobaan_login) = 0, 'login: bendahara tidak membaca tabel percobaan');
select uji.harus_gagal($q$select public.buka_kunci_login('f0000000-0000-0000-0000-0000000000d1')$q$, 'login: bendahara tidak dapat membuka kunci', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000c1');
select uji.harus_gagal($q$select public.buka_kunci_login('f0000000-0000-0000-0000-0000000000d1')$q$, 'login: humas tidak dapat membuka kunci', '42501');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((select count(*) from public.percobaan_login where nomor_hp = '6281200000010') = 1, 'login: admin melihat status penghitung akun');
select public.buka_kunci_login('f0000000-0000-0000-0000-0000000000d1');
select uji.cek((select count(*) from public.percobaan_login where nomor_hp = '6281200000010') = 0, 'login: admin membuka kunci (penghitung dihapus)');
select uji.cek((public.cek_batas_login('081200000010') ->> 'tunggu')::int = 0, 'login: setelah dibuka kunci tidak ditunda');
select uji.kembali();

-- Hook server: gagal dicatat, benar-saat-ditunda ditolak tanpa memutus sesi, benar-saat-bersih menghapus penghitung
select public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":false}'::jsonb) from generate_series(1, 4);
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":false}') ->> 'decision') = 'reject', 'hook: gagal ke-5 ditolak dengan pesan tunggu');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":true}') ->> 'decision') = 'reject', 'hook: PIN benar saat ditunda tetap ditolak');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":true}') ->> 'should_logout_user') = 'false', 'hook: penolakan tidak memutus sesi aktif pemilik akun');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":true}') ->> 'message') like 'Terlalu banyak percobaan salah. Coba lagi dalam%', 'hook: pesan penolakan berbahasa Indonesia');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"00000000-0000-0000-0000-000000000000","valid":false}') ->> 'decision') = 'continue', 'hook: pengguna tak dikenal dibiarkan lewat (tidak membuat catatan)');
select uji.cek((select gagal_beruntun from public.percobaan_login where nomor_hp = '6281200000011') = 5, 'hook: 5 gagal tercatat; PIN benar saat ditunda tidak menambah hitungan');
-- Pencatatan klien tepat setelah hook tidak dihitung dua kali
select uji.anon();
insert into uji.h select 'dedupe', public.catat_login_gagal('081200000011');
select uji.kembali();
select uji.cek((select gagal_beruntun from public.percobaan_login where nomor_hp = '6281200000011') = 5, 'hook+klien: percobaan yang sama tidak dihitung dua kali');
select uji.cek((select (j ->> 'tunggu')::int from uji.h where nama = 'dedupe') > 0, 'hook+klien: klien tetap menerima sisa waktu tunggu');
update public.percobaan_login set terkunci_sampai = null where nomor_hp = '6281200000011';
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":true}') ->> 'decision') = 'continue', 'hook: PIN benar tanpa tunda lolos');
select uji.cek((select count(*) from public.percobaan_login where nomor_hp = '6281200000011') = 0, 'hook: masuk berhasil menghapus penghitung');
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_penegakan_login() ->> 'hook_aktif')::boolean, 'login: admin melihat penegakan server aktif setelah hook dipanggil');
select uji.kembali();

-- Masuk berhasil menghapus penghitung milik sendiri (tidak sedang ditunda)
select uji.anon();
select public.catat_login_gagal('081200000020') from generate_series(1, 2);
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d2');
select public.catat_login_berhasil();
select uji.kembali();
select uji.cek((select count(*) from public.percobaan_login where nomor_hp = '6281200000020') = 0, 'login: masuk berhasil menghapus penghitung milik sendiri');

-- Saklar dimatikan: tidak ada penundaan, pencatatan, atau penolakan hook
update public.status_keamanan set batas_login_aktif = false where id = 1;
update public.percobaan_login set terkunci_sampai = now() + interval '1 hour', gagal_beruntun = 9 where nomor_hp = '6281200000010';
select uji.anon();
select uji.cek((public.cek_batas_login('081200000010') ->> 'tunggu')::int = 0 and (public.cek_batas_login('081200000010') ->> 'sisa')::int = 5, 'login mati: tidak ditunda walau ada catatan lama');
select public.catat_login_gagal('081200000030') from generate_series(1, 12);
select uji.cek((public.catat_login_gagal('081200000030') ->> 'tunggu')::int = 0, 'login mati: 13x salah tetap tanpa tunda');
select uji.kembali();
select uji.cek((select count(*) from public.percobaan_login where nomor_hp = '6281200000030') = 0, 'login mati: percobaan salah tidak dicatat');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":false}') ->> 'decision') = 'continue', 'login mati: hook salah PIN dibiarkan lewat');
select uji.cek((public.hook_verifikasi_pin('{"user_id":"f0000000-0000-0000-0000-0000000000d3","valid":true}') ->> 'decision') = 'continue', 'login mati: hook PIN benar lewat');
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek(not (public.status_penegakan_login() ->> 'batas_aktif')::boolean, 'login mati: admin melihat batas nonaktif');
select uji.kembali();
-- migrasi 19 dijalankan ulang menghapus penundaan sisa saat mati
\i 19-nonaktifkan-batas-login.sql
select uji.cek((select count(*) from public.percobaan_login) = 0, 'login mati: migrasi 19 menghapus semua penundaan lama');

-- =====================================================================
-- F. PENANDA PG_CRON (tagihan otomatis)
-- =====================================================================
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'cron_ada')::boolean = false and (public.status_tagihan_otomatis() ->> 'siap')::boolean = false, 'cron: tanpa pg_cron penanda menyatakan belum siap');
select uji.cek((public.status_tagihan_otomatis() ->> 'masalah') like 'pg_cron belum aktif%', 'cron: pesan masalah jelas');
select uji.cek((public.status_tagihan_otomatis() ->> 'perlu_tindakan')::boolean = false, 'cron: saklar mati -> bukan peringatan keras');
select uji.kembali();
update public.pengaturan set tagihan_otomatis = true where id = 1;
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'perlu_tindakan')::boolean, 'cron: saklar menyala tanpa pg_cron -> perlu tindakan');
select uji.kembali();
create schema cron;
create table cron.job (jobid bigserial primary key, jobname text, active boolean default true, schedule text);
create table cron.job_run_details (runid bigserial primary key, jobid bigint, status text, start_time timestamptz);
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'masalah') like 'Jadwal tagihan otomatis belum terpasang%', 'cron: pg_cron ada tetapi jadwal belum dipasang');
select uji.kembali();
insert into cron.job (jobname) values ('tagihan-ipl-otomatis');
insert into cron.job_run_details (jobid, status, start_time) values (1, 'succeeded', now());
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'siap')::boolean and not (public.status_tagihan_otomatis() ->> 'perlu_tindakan')::boolean, 'cron: jadwal aktif dan berhasil -> siap');
select uji.kembali();
update cron.job_run_details set status = 'failed';
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'masalah') like 'Jalan terakhir%tidak berhasil%' and (public.status_tagihan_otomatis() ->> 'perlu_tindakan')::boolean, 'cron: jalan terakhir gagal -> perlu tindakan');
select uji.kembali();
update cron.job set active = false;
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.cek((public.status_tagihan_otomatis() ->> 'masalah') like '%dinonaktifkan%', 'cron: jadwal dinonaktifkan terdeteksi');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.harus_gagal($q$select public.status_tagihan_otomatis()$q$, 'cron: bendahara tidak dapat memeriksa status (khusus admin)', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.harus_gagal($q$select public.status_tagihan_otomatis()$q$, 'cron: warga biasa tidak dapat memeriksa status', '42501');
select uji.kembali();
select uji.anon();
select uji.harus_gagal($q$select public.status_tagihan_otomatis()$q$, 'cron: anon tidak dapat memeriksa status', '42501');
select uji.kembali();

-- =====================================================================
-- G. PIN: fungsi pembangkit tidak dapat dipanggil dari aplikasi
-- =====================================================================
select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
select uji.harus_gagal($q$select public._pin_acak()$q$, 'PIN acak: fungsi pembangkit tidak dapat dipanggil langsung (bahkan oleh admin)', '42501');
select uji.kembali();

-- =====================================================================
-- H. PENYIMPANAN: bucket publik hanya untuk foto lingkungan dan QRIS; berkas pribadi privat per peran
-- =====================================================================
select uji.cek((select count(*) from storage.buckets where id in ('konten', 'bukti') and public) = 0, 'storage: bucket konten dan bukti privat');
select uji.cek((select public from storage.buckets where id = 'publik'), 'storage: bucket publik memang publik (foto lingkungan, QRIS)');

select uji.sebagai('f0000000-0000-0000-0000-0000000000a1');
insert into storage.objects (bucket_id, name) values ('publik', 'lingkungan/1-abc.jpg');
insert into storage.objects (bucket_id, name) values ('publik', 'qris/1-abc.jpg');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('publik', 'avatar/f0000000-0000-0000-0000-0000000000a1/foto.jpg')$q$, 'storage: admin tidak dapat menaruh foto profil di bucket publik', '42501');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('publik', 'ipl/f0000000-0000-0000-0000-0000000000a1/bukti.jpg')$q$, 'storage: admin tidak dapat menaruh bukti transfer di bucket publik', '42501');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('publik', 'foto-saja.jpg')$q$, 'storage: berkas tanpa folder di bucket publik ditolak', '42501');
select uji.kembali();

select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('publik', 'lingkungan/2-abc.jpg')$q$, 'storage: bendahara tidak dapat menulis ke bucket publik', '42501');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('publik', 'lingkungan/3-abc.jpg')$q$, 'storage: warga biasa tidak dapat menulis ke bucket publik', '42501');
insert into storage.objects (bucket_id, name) values ('konten', 'avatar/f0000000-0000-0000-0000-0000000000d1/foto.jpg');
select uji.harus_gagal($q$insert into storage.objects (bucket_id, name) values ('konten', 'avatar/f0000000-0000-0000-0000-0000000000d2/foto.jpg')$q$, 'storage: warga tidak dapat menaruh foto profil di folder orang lain', '42501');
select uji.kembali();

-- Berkas pribadi: siapa yang boleh membaca
insert into storage.objects (bucket_id, name) values
  ('konten', 'laporan/f0000000-0000-0000-0000-0000000000d1/aduan.jpg'),
  ('bukti',  'ipl/f0000000-0000-0000-0000-0000000000d1/bukti.jpg');

select uji.sebagai('f0000000-0000-0000-0000-0000000000d1');
select uji.cek((select count(*) from storage.objects where name like 'laporan/%') = 1, 'storage: pelapor membaca foto laporannya sendiri');
select uji.cek((select count(*) from storage.objects where name like 'ipl/%') = 1, 'storage: warga membaca bukti transfernya sendiri');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000d2');
select uji.cek((select count(*) from storage.objects where name like 'laporan/%' or name like 'ipl/%') = 0, 'storage: warga lain tidak membaca foto laporan maupun bukti transfer orang lain');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000c1');
select uji.cek((select count(*) from storage.objects where name like 'laporan/%') = 1, 'storage: humas membaca foto laporan warga di jalannya');
select uji.cek((select count(*) from storage.objects where name like 'ipl/%') = 0, 'storage: humas tidak membaca bukti transfer IPL');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000b1');
select uji.cek((select count(*) from storage.objects where name like 'ipl/%') = 1, 'storage: bendahara blok A membaca bukti transfer warga blok A');
select uji.kembali();
select uji.sebagai('f0000000-0000-0000-0000-0000000000b2');
select uji.cek((select count(*) from storage.objects where name like 'ipl/%') = 0, 'storage: bendahara blok B tidak membaca bukti transfer warga blok A');
select uji.cek((select count(*) from storage.objects where name like 'laporan/%') = 0, 'storage: bendahara bukan pengelola laporan, tidak membaca foto laporan');
select uji.kembali();

rollback;
\o
\echo
\echo '=== SEMUA UJI FITUR LULUS ==='
