-- =====================================================================
-- Uji 20-perbaikan-warga-massal.sql: perbarui_warga_massal dan ubah_hp_warga per peran.
-- Peran: admin, humas (Jl. Massal A di blok A), warga biasa.
-- Dijalankan oleh supabase/tests/jalankan.sh, pada database LOKAL. Seluruhnya di-ROLLBACK.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
begin;

create schema ujm;
grant usage on schema ujm to public;
create function ujm.sebagai(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end $$;
create function ujm.kembali() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
create function ujm.cek(p_kondisi boolean, p_nama text) returns void language plpgsql as $$
begin
  if p_kondisi is not true then raise exception 'GAGAL: %', p_nama; end if;
  raise notice 'lulus  - %', p_nama;
end $$;
create function ujm.harus_gagal(p_sql text, p_nama text, p_kode text default null) returns void language plpgsql as $$
declare v_kode text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_kode = returned_sqlstate;
    if p_kode is not null and v_kode <> p_kode then
      raise exception 'GAGAL: % (kode %, seharusnya %)', p_nama, v_kode, p_kode;
    end if;
    raise notice 'lulus  - % [%]', p_nama, v_kode;
    return;
  end;
  raise exception 'GAGAL: % (seharusnya ditolak)', p_nama;
end $$;
create table ujm.h (nama text primary key, j jsonb);
grant all on ujm.h to public;
-- Alasan baris ke-n yang dilewati (atau null)
create function ujm.alasan(p_h text, p_baris int) returns text language sql as $$
  select x ->> 'alasan' from ujm.h, jsonb_array_elements(j -> 'dilewati') x where nama = p_h and (x ->> 'baris')::int = p_baris
$$;

-- ---------------------------------------------------------------------
-- Data uji
-- ---------------------------------------------------------------------
insert into public.blok (kode, nama) values ('A', 'Blok A'), ('B', 'Blok B') on conflict do nothing;
insert into public.gang (id, nama, blok) values
  ('9b000000-0000-0000-0000-00000000000a', 'Jl. Massal A', 'A'),
  ('9b000000-0000-0000-0000-0000000000a2', 'Jl. Massal A2', 'A'),
  ('9b000000-0000-0000-0000-00000000000b', 'Jl. Massal B', 'B');

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('e0000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', '6281300000001@akun.uji.local', '{"nama":"Admin Massal","nomor_hp":"081300000001"}'),
  ('e0000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', '6281300000002@akun.uji.local', '{"nama":"Humas Massal","nomor_hp":"081300000002"}'),
  ('e0000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', '6281300000010@akun.uji.local', '{"nama":"Warga Satu","nomor_hp":"081300000010"}'),
  ('e0000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', '6281300000020@akun.uji.local', '{"nama":"Warga Dua","nomor_hp":"081300000020"}'),
  ('e0000000-0000-0000-0000-0000000000d3', 'authenticated', 'authenticated', 'google.tiga@contoh.id',         '{"nama":"Warga Tiga","nomor_hp":"081300000030"}'),
  ('e0000000-0000-0000-0000-0000000000d4', 'authenticated', 'authenticated', '6281300000040@akun.uji.local', '{"nama":"Pendaftar Empat","nomor_hp":"081300000040"}');
insert into auth.identities (provider_id, user_id, identity_data, provider)
  select id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email' from auth.users where id::text like 'e0000000%';

update public.warga set status = 'aktif', role = 'admin', blok = 'A', no_rumah = '1' where id = 'e0000000-0000-0000-0000-0000000000a1';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '2', gang_id = '9b000000-0000-0000-0000-00000000000a' where id = 'e0000000-0000-0000-0000-0000000000c1';
update public.warga set status = 'aktif', blok = 'A', no_rumah = '3/10', gang_id = '9b000000-0000-0000-0000-00000000000a', pekerjaan = 'Guru' where id = 'e0000000-0000-0000-0000-0000000000d1';
update public.warga set status = 'aktif', blok = 'B', no_rumah = '10', gang_id = '9b000000-0000-0000-0000-00000000000b' where id = 'e0000000-0000-0000-0000-0000000000d2';
update public.warga set status = 'aktif', blok = 'A', no_rumah = '11', gang_id = '9b000000-0000-0000-0000-00000000000a' where id = 'e0000000-0000-0000-0000-0000000000d3';
update public.warga set blok = 'A', no_rumah = '12', gang_id = '9b000000-0000-0000-0000-00000000000a' where id = 'e0000000-0000-0000-0000-0000000000d4';
update public.warga_kontak set status_hunian = 'milik_sendiri', status_pernikahan = 'menikah', jumlah_anak = 2 where warga_id = 'e0000000-0000-0000-0000-0000000000d1';
insert into public.pengurus (warga_id, jabatan, peran, wilayah_gang) values
  ('e0000000-0000-0000-0000-0000000000c1', 'Humas Jl. Massal A', 'humas', '9b000000-0000-0000-0000-00000000000a');

-- =====================================================================
-- A. ADMIN
-- =====================================================================
select ujm.sebagai('e0000000-0000-0000-0000-0000000000a1');
insert into ujm.h values ('admin1', public.perbarui_warga_massal($j$[
  {"id":"e0000000-0000-0000-0000-0000000000d1","status_hunian":"kontrak","pekerjaan":"Dosen"},
  {"id":"e0000000-0000-0000-0000-0000000000d2","nama":"Warga Dua Baru","hp":"0813-0000-0021","gang":"","kepala_keluarga":"tidak"},
  {"id":"e0000000-0000-0000-0000-0000000000d3","hp":"081300000031"},
  {"id":"e0000000-0000-0000-0000-0000000000d1","blok":"Z"},
  {"id":"bukan-uuid","nama":"Salah"},
  {"id":"e0000000-0000-0000-0000-0000000000d4","status":"aktif"},
  {"id":"e0000000-0000-0000-0000-0000000000a1","status":"nonaktif"},
  {"id":"e0000000-0000-0000-0000-0000000000d1","hp":"081300000001"},
  {"id":"e0000000-0000-0000-0000-0000000000d1","gang":"Jl. Massal B"},
  {"id":"e0000000-0000-0000-0000-0000000000d1","foto":"http://tidak-aman.id/a.jpg"},
  {"id":"e0000000-0000-0000-0000-0000000000d1","status_pernikahan":"menikah siri"}
]$j$::jsonb, 'akun.uji.local'));
select ujm.kembali();

select ujm.cek((select (j ->> 'diubah')::int from ujm.h where nama = 'admin1') = 3, 'admin: 3 baris valid diperbarui, 8 dilewati');
select ujm.cek((select jsonb_array_length(j -> 'dilewati') from ujm.h where nama = 'admin1') = 8, 'admin: 8 baris dilewati dilaporkan');
select ujm.cek((select status_hunian from public.warga_kontak where warga_id = 'e0000000-0000-0000-0000-0000000000d1') = 'kontrak', 'admin: status hunian diganti');
select ujm.cek((select pekerjaan from public.warga where id = 'e0000000-0000-0000-0000-0000000000d1') = 'Dosen', 'admin: pekerjaan diganti');
select ujm.cek((select nama || '|' || no_rumah || '|' || blok from public.warga where id = 'e0000000-0000-0000-0000-0000000000d1') = 'Warga Satu|3/10|A', 'admin: kolom yang tidak dikirim tidak berubah');
select ujm.cek((select status_pernikahan || '|' || jumlah_anak from public.warga_kontak where warga_id = 'e0000000-0000-0000-0000-0000000000d1') = 'menikah|2', 'admin: data sensus yang tidak dikirim tetap');
select ujm.cek((select nama from public.warga where id = 'e0000000-0000-0000-0000-0000000000d2') = 'Warga Dua Baru', 'admin: nama diganti');
select ujm.cek((select gang_id is null and not kepala_keluarga from public.warga where id = 'e0000000-0000-0000-0000-0000000000d2'), 'admin: jalan dikosongkan dan kepala keluarga = tidak');
select ujm.cek((select nomor_hp from public.warga_kontak where warga_id = 'e0000000-0000-0000-0000-0000000000d2') = '6281300000021', 'admin: nomor HP kontak diganti');
select ujm.cek((select email from auth.users where id = 'e0000000-0000-0000-0000-0000000000d2') = '6281300000021@akun.uji.local', 'admin: email login ikut diganti (bisa masuk dengan HP baru)');
select ujm.cek((select identity_data ->> 'email' from auth.identities where user_id = 'e0000000-0000-0000-0000-0000000000d2') = '6281300000021@akun.uji.local', 'admin: identitas login ikut diganti');
select ujm.cek((select nomor_hp from public.warga_kontak where warga_id = 'e0000000-0000-0000-0000-0000000000d3') = '6281300000031', 'admin: HP akun Google diganti di kontak');
select ujm.cek((select email from auth.users where id = 'e0000000-0000-0000-0000-0000000000d3') = 'google.tiga@contoh.id', 'admin: email akun Google tidak diubah');
select ujm.cek(ujm.alasan('admin1', 4) like 'Blok "Z" tidak dikenal%', 'admin: blok tidak dikenal ditolak per baris');
select ujm.cek(ujm.alasan('admin1', 5) = 'Kolom id tidak valid', 'admin: id tidak valid ditolak');
select ujm.cek(ujm.alasan('admin1', 6) like 'Pendaftar yang belum disetujui%', 'admin: pendaftar menunggu tidak bisa diaktifkan lewat massal');
select ujm.cek(ujm.alasan('admin1', 7) = 'Status akun sendiri tidak dapat diubah', 'admin: tidak bisa menonaktifkan diri sendiri');
select ujm.cek(ujm.alasan('admin1', 8) like 'Nomor HP % sudah dipakai warga lain', 'admin: HP milik warga lain ditolak');
select ujm.cek(ujm.alasan('admin1', 9) like 'Jalan "Jl. Massal B" belum terdaftar di Blok A', 'admin: jalan harus ada di blok warga');
select ujm.cek(ujm.alasan('admin1', 10) = 'Tautan foto harus diawali https://', 'admin: foto non-https ditolak');
select ujm.cek(ujm.alasan('admin1', 11) like 'Status pernikahan "menikah siri" tidak dikenal', 'admin: status pernikahan tidak dikenal ditolak');
select ujm.cek((select status from public.warga where id = 'e0000000-0000-0000-0000-0000000000d4') = 'menunggu', 'admin: pendaftar tetap menunggu');
select ujm.cek(exists (select 1 from public.aktivitas where teks = 'memperbarui 3 data warga'), 'admin: aktivitas tercatat');

-- Pindah blok: jalan lama di blok lain otomatis dikosongkan, rumah baru terhubung
select ujm.sebagai('e0000000-0000-0000-0000-0000000000a1');
insert into ujm.h values ('admin2', public.perbarui_warga_massal('[{"id":"e0000000-0000-0000-0000-0000000000d1","blok":"B","no_rumah":"5"}]'::jsonb, 'akun.uji.local'));
select ujm.kembali();
select ujm.cek((select (j ->> 'diubah')::int from ujm.h where nama = 'admin2') = 1, 'admin: pindah blok berhasil');
select ujm.cek((select gang_id is null and blok = 'B' and no_rumah = '5' from public.warga where id = 'e0000000-0000-0000-0000-0000000000d1'), 'admin: pindah blok mengosongkan jalan blok lama');
select ujm.cek((select r.blok = 'B' and r.nomor = '5' from public.warga w join public.rumah r on r.id = w.rumah_id where w.id = 'e0000000-0000-0000-0000-0000000000d1'), 'admin: rumah baru terhubung (dasar tagihan IPL)');

-- ubah_hp_warga dari form Ubah anggota
select ujm.sebagai('e0000000-0000-0000-0000-0000000000a1');
select public.ubah_hp_warga('e0000000-0000-0000-0000-0000000000d1', '+62 813-0000-0011', 'akun.uji.local');
select ujm.harus_gagal($q$select public.ubah_hp_warga('e0000000-0000-0000-0000-0000000000d1', '081300000002', 'akun.uji.local')$q$, 'ubah_hp_warga: HP milik warga lain ditolak');
select ujm.harus_gagal($q$select public.ubah_hp_warga('e0000000-0000-0000-0000-0000000000d1', '123', 'akun.uji.local')$q$, 'ubah_hp_warga: HP tidak valid ditolak');
select ujm.kembali();
select ujm.cek((select email from auth.users where id = 'e0000000-0000-0000-0000-0000000000d1') = '6281300000011@akun.uji.local', 'ubah_hp_warga: email login ikut diganti');

-- =====================================================================
-- B. HUMAS (hanya Jl. Massal A, tanpa HP dan foto)
-- =====================================================================
select ujm.sebagai('e0000000-0000-0000-0000-0000000000c1');
insert into ujm.h values ('humas1', public.perbarui_warga_massal($j$[
  {"id":"e0000000-0000-0000-0000-0000000000d3","status_pernikahan":"menikah","jumlah_anak":"1","status_hunian":"milik sendiri"},
  {"id":"e0000000-0000-0000-0000-0000000000d2","pekerjaan":"Di luar wilayah"},
  {"id":"e0000000-0000-0000-0000-0000000000d3","hp":"081300000039"},
  {"id":"e0000000-0000-0000-0000-0000000000d3","gang":"Jl. Massal A2"},
  {"id":"e0000000-0000-0000-0000-0000000000a1","pekerjaan":"Admin"},
  {"id":"e0000000-0000-0000-0000-0000000000c1","pekerjaan":"Diri sendiri"},
  {"id":"e0000000-0000-0000-0000-0000000000d3","foto":"https://contoh.id/foto.jpg"}
]$j$::jsonb, 'akun.uji.local'));
select ujm.harus_gagal($q$select public.ubah_hp_warga('e0000000-0000-0000-0000-0000000000d3', '081300000039', 'akun.uji.local')$q$, 'humas: ubah_hp_warga ditolak', '42501');
select ujm.kembali();
select ujm.cek((select (j ->> 'diubah')::int from ujm.h where nama = 'humas1') = 1, 'humas: hanya 1 baris di wilayahnya yang diperbarui');
select ujm.cek((select status_pernikahan || '|' || jumlah_anak || '|' || status_hunian from public.warga_kontak where warga_id = 'e0000000-0000-0000-0000-0000000000d3') = 'menikah|1|milik_sendiri', 'humas: data sensus warga di jalannya diperbarui');
select ujm.cek(ujm.alasan('humas1', 2) = 'Warga ini di luar wilayah kewenangan Anda', 'humas: warga di luar jalannya ditolak');
select ujm.cek(ujm.alasan('humas1', 3) = 'Nomor HP hanya bisa diubah admin', 'humas: nomor HP ditolak');
select ujm.cek(ujm.alasan('humas1', 4) is not null, 'humas: memindahkan warga ke jalan lain ditolak');
select ujm.cek(ujm.alasan('humas1', 5) = 'Data admin hanya dapat diubah admin', 'humas: data admin ditolak');
select ujm.cek(ujm.alasan('humas1', 6) = 'Data diri sendiri diubah lewat menu Profil', 'humas: data diri sendiri ditolak');
select ujm.cek(ujm.alasan('humas1', 7) = 'Foto hanya bisa diubah admin', 'humas: foto ditolak');
select ujm.cek((select pekerjaan is null from public.warga where id = 'e0000000-0000-0000-0000-0000000000d2'), 'humas: warga di luar wilayah tidak berubah');
select ujm.cek((select gang_id = '9b000000-0000-0000-0000-00000000000a' from public.warga where id = 'e0000000-0000-0000-0000-0000000000d3'), 'humas: jalan warga tidak berpindah');

-- =====================================================================
-- C. WARGA BIASA
-- =====================================================================
select ujm.sebagai('e0000000-0000-0000-0000-0000000000d3');
select ujm.harus_gagal($q$select public.perbarui_warga_massal('[{"id":"e0000000-0000-0000-0000-0000000000d1","nama":"Iseng"}]'::jsonb, 'akun.uji.local')$q$, 'warga biasa: pembaruan massal ditolak', '42501');
select ujm.harus_gagal($q$select public._ganti_hp_warga('e0000000-0000-0000-0000-0000000000d1', '081300000077', 'akun.uji.local')$q$, 'warga biasa: fungsi internal ganti HP tidak bisa dipanggil', '42501');
select ujm.kembali();
select ujm.cek((select nama from public.warga where id = 'e0000000-0000-0000-0000-0000000000d1') = 'Warga Satu', 'warga biasa: data tidak berubah');

rollback;
\o
\echo
\echo '=== SEMUA UJI PERBAIKAN MASSAL LULUS ==='
