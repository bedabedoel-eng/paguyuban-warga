-- =====================================================================
-- Uji RLS & hak akses per peran (jalankan lewat supabase/tests/jalankan.sh pada database LOKAL).
-- Seluruh uji berjalan di dalam satu transaksi lalu di-ROLLBACK, jadi tidak meninggalkan data.
-- Jangan dijalankan di database produksi.
--
-- Cara kerja: tiap uji berpindah peran ke `authenticated` dengan klaim JWT `sub` milik tokoh tertentu,
-- persis seperti permintaan PostgREST, sehingga RLS dan trigger berlaku apa adanya.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
begin;

create schema uji;
grant usage on schema uji to public;

-- Berpindah ke peran pengguna tertentu / kembali ke superuser
create function uji.sebagai(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end $$;
create function uji.kembali() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Pernyataan: kondisi harus benar
create function uji.cek(p_kondisi boolean, p_nama text) returns void language plpgsql as $$
begin
  if p_kondisi is not true then raise exception 'GAGAL: %', p_nama; end if;
  raise notice 'lulus  - %', p_nama;
end $$;

-- Pernyataan: perintah harus ditolak (opsional: dengan kode SQLSTATE tertentu)
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

-- ---------------------------------------------------------------------
-- Data uji (dibuat sebagai superuser)
-- ---------------------------------------------------------------------
insert into public.blok (kode, nama) values ('A', 'Blok A'), ('B', 'Blok B') on conflict do nothing;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ketua@uji.local',      '{"nama":"Ketua Uji"}'),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'wakil@uji.local',      '{"nama":"Wakil Uji"}'),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'bendahara@uji.local',  '{"nama":"Bendahara Uji"}'),
  ('a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'wargaa@uji.local',     '{"nama":"Warga Rumah A"}'),
  ('a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'wargab@uji.local',     '{"nama":"Warga Rumah B"}');

update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '1' where id = 'a0000000-0000-0000-0000-000000000001';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '2' where id = 'a0000000-0000-0000-0000-000000000002';
update public.warga set status = 'aktif', role = 'pengurus', blok = 'A', no_rumah = '3' where id = 'a0000000-0000-0000-0000-000000000003';
update public.warga set status = 'aktif', blok = 'A', no_rumah = '10' where id = 'a0000000-0000-0000-0000-000000000004';
update public.warga set status = 'aktif', blok = 'B', no_rumah = '10' where id = 'a0000000-0000-0000-0000-000000000005';

insert into public.pengurus (warga_id, jabatan, peran) values
  ('a0000000-0000-0000-0000-000000000001', 'Ketua', 'ketua'),
  ('a0000000-0000-0000-0000-000000000002', 'Wakil Ketua', 'wakil_ketua'),
  ('a0000000-0000-0000-0000-000000000003', 'Bendahara', 'bendahara');

insert into public.tagihan_ipl (rumah_id, periode, nominal)
  select w.rumah_id, '2026-10-01', 100000 from public.warga w where w.id in ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005');
-- Periode lain hanya untuk rumah B (membuktikan daftar periode mengikuti RLS)
insert into public.tagihan_ipl (rumah_id, periode, nominal)
  select w.rumah_id, '2026-09-01', 100000 from public.warga w where w.id = 'a0000000-0000-0000-0000-000000000005';

update public.pengaturan set batas_persetujuan = 1000000 where id = 1;

-- ---------------------------------------------------------------------
-- 1. Warga biasa: terbatas pada rumahnya sendiri, tidak bisa menaikkan hak
-- ---------------------------------------------------------------------
select uji.sebagai('a0000000-0000-0000-0000-000000000004');

select uji.cek((select count(*) from public.tagihan_ipl) = 1, 'warga A hanya melihat tagihan rumahnya (bukan rumah B)');
select uji.cek((select count(*) from public.tagihan_ipl where periode = '2026-09-01') = 0, 'warga A tidak melihat tagihan periode milik rumah B');
select uji.cek((select count(*) from public.periode_ipl_tersedia()) = 1, 'periode_ipl_tersedia mengikuti RLS (warga A: 1 periode)');
select uji.cek((select count(*) from public.audit_log) = 0, 'warga tidak dapat membaca log audit');
select uji.harus_gagal($q$update public.warga set role = 'admin' where id = auth.uid()$q$, 'warga tidak dapat menjadikan dirinya admin', '42501');
select uji.harus_gagal($q$update public.warga set status = 'aktif', rumah_id = null where id = auth.uid()$q$, 'warga tidak dapat mengubah rumah/status sendiri', '42501');
select uji.harus_gagal($q$insert into public.transaksi_kas (jenis, kategori, jumlah) values ('pemasukan', 'Donasi', 1000)$q$, 'warga tidak dapat mencatat kas', '42501');
do $q$
declare n int;
begin
  update public.tagihan_ipl set status = 'lunas';
  get diagnostics n = row_count;
  perform uji.cek(n = 0, 'warga tidak dapat melunasi tagihan sendiri (0 baris terpengaruh)');
end $q$;
select uji.harus_gagal($q$insert into public.audit_log (tabel, aksi) values ('transaksi_kas', 'INSERT')$q$, 'warga tidak dapat menulis log audit', '42501');
select uji.harus_gagal($q$select public.pulihkan_transaksi(1)$q$, 'warga tidak dapat memulihkan transaksi', '42501');
select uji.harus_gagal($q$select public._audit_baris()$q$, 'fungsi internal audit tidak dapat dipanggil warga', '42501');

select uji.kembali();

-- ---------------------------------------------------------------------
-- 2. Wakil Ketua: boleh melihat kas rinci, tetapi tidak mencatat/memulihkan
-- ---------------------------------------------------------------------
select uji.sebagai('a0000000-0000-0000-0000-000000000002');
select uji.harus_gagal($q$insert into public.transaksi_kas (jenis, kategori, jumlah) values ('pengeluaran', 'Kebersihan', 50000)$q$, 'wakil ketua tidak dapat mencatat kas', '42501');
select uji.harus_gagal($q$select public.pulihkan_transaksi(1)$q$, 'wakil ketua tidak dapat memulihkan transaksi', '42501');
select uji.harus_gagal($q$select public.putuskan_pengeluaran(gen_random_uuid(), true, null)$q$, 'wakil ketua tidak dapat menyetujui pengeluaran', '42501');
select uji.kembali();

-- ---------------------------------------------------------------------
-- 3. Bendahara: pengeluaran besar menunggu Ketua; semua perubahan tercatat
-- ---------------------------------------------------------------------
select uji.sebagai('a0000000-0000-0000-0000-000000000003');

insert into public.transaksi_kas (id, jenis, kategori, jumlah, tanggal, keterangan)
values ('c0000000-0000-0000-0000-000000000001', 'pengeluaran', 'Kebersihan', 150000, '2026-10-05', 'Beli sapu');
insert into public.transaksi_kas (id, jenis, kategori, jumlah, tanggal, keterangan)
values ('c0000000-0000-0000-0000-000000000002', 'pengeluaran', 'Perbaikan', 5000000, '2026-10-06', 'Perbaikan gerbang');

select uji.cek((select status from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000001') = 'disetujui', 'pengeluaran kecil langsung disetujui');
select uji.cek((select status from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000002') = 'menunggu', 'pengeluaran >= batas oleh bendahara berstatus menunggu');
select uji.harus_gagal($q$update public.transaksi_kas set status = 'disetujui' where id = 'c0000000-0000-0000-0000-000000000002'$q$, 'bendahara tidak dapat menyetujui sendiri lewat UPDATE', '42501');
select uji.harus_gagal($q$select public.putuskan_pengeluaran('c0000000-0000-0000-0000-000000000002', true, null)$q$, 'bendahara bukan Ketua: tidak dapat memutuskan pengeluaran', '42501');

-- ringkasan_transaksi: jumlah baris mencakup yang menunggu, total hanya yang disetujui
select uji.cek((public.ringkasan_transaksi('pengeluaran', '2026-10-01', '2026-10-31') ->> 'jumlah')::int = 2, 'ringkasan_transaksi: jumlah baris termasuk yang menunggu');
select uji.cek((public.ringkasan_transaksi('pengeluaran', '2026-10-01', '2026-10-31') ->> 'pengeluaran')::bigint = 150000, 'ringkasan_transaksi: total hanya yang disetujui');

-- Audit mencatat tambah + pelaku
select uji.cek((select count(*) from public.audit_log where tabel = 'transaksi_kas' and aksi = 'INSERT') = 2, 'audit: dua penambahan tercatat');
select uji.cek((select pelaku_nama from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'INSERT') = 'Bendahara Uji', 'audit: nama pelaku tersimpan');

-- Ubah isi → UPDATE tercatat dengan sebelum/sesudah; ubah tanpa perubahan → tidak tercatat
update public.transaksi_kas set jumlah = 175000 where id = 'c0000000-0000-0000-0000-000000000001';
select uji.cek((select (sebelum ->> 'jumlah')::int = 150000 and (sesudah ->> 'jumlah')::int = 175000 from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'UPDATE'), 'audit: UPDATE menyimpan nilai sebelum dan sesudah');
update public.transaksi_kas set jumlah = 175000 where id = 'c0000000-0000-0000-0000-000000000001';
select uji.cek((select count(*) from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'UPDATE') = 1, 'audit: UPDATE tanpa perubahan tidak dicatat');

-- Hapus → DELETE tercatat; pulihkan mengembalikan baris yang sama
delete from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000001';
select uji.cek((select count(*) from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000001') = 0, 'transaksi terhapus dari kas');
select uji.cek((select count(*) from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'DELETE') = 1, 'audit: penghapusan tercatat');

select public.pulihkan_transaksi((select id from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'DELETE'));
select uji.cek((select jumlah from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000001') = 175000, 'pulihkan: baris kembali dengan isi terakhir dan id yang sama');
select uji.cek((select status from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000001') = 'disetujui', 'pulihkan: pengeluaran kecil kembali disetujui');
select uji.harus_gagal($q$select public.pulihkan_transaksi((select id from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000001' and aksi = 'DELETE'))$q$, 'pulihkan dua kali ditolak (sudah ada di kas)');

-- Log audit tidak bisa diubah/dihapus lewat API
select uji.harus_gagal($q$update public.audit_log set pelaku_nama = 'x'$q$, 'bendahara tidak dapat mengubah log audit', '42501');
select uji.harus_gagal($q$delete from public.audit_log$q$, 'bendahara tidak dapat menghapus log audit', '42501');

-- Penghapusan tagihan IPL tercatat
delete from public.tagihan_ipl where periode = '2026-09-01';
select uji.cek((select count(*) from public.audit_log where tabel = 'tagihan_ipl' and aksi = 'DELETE') = 1, 'audit: penghapusan tagihan IPL tercatat');
select uji.cek((select count(*) from public.periode_ipl_tersedia()) = 1, 'periode_ipl_tersedia: bendahara melihat periode yang masih ada');

select uji.kembali();

-- ---------------------------------------------------------------------
-- 4. Ketua: menyetujui; memulihkan pengeluaran besar tidak melewati persetujuan
-- ---------------------------------------------------------------------
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
select public.putuskan_pengeluaran('c0000000-0000-0000-0000-000000000002', true, null);
select uji.cek((select status from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000002') = 'disetujui', 'Ketua dapat menyetujui pengeluaran besar');
select uji.cek((select count(*) from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000002' and aksi = 'UPDATE') = 1, 'audit: keputusan persetujuan tercatat');
select uji.cek((select count(*) from public.audit_log) >= 5, 'Ketua dapat membaca log audit');
select uji.kembali();

-- Bendahara menghapus pengeluaran besar yang sudah disetujui lalu memulihkannya
select uji.sebagai('a0000000-0000-0000-0000-000000000003');
delete from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000002';
select public.pulihkan_transaksi((select id from public.audit_log where baris_id = 'c0000000-0000-0000-0000-000000000002' and aksi = 'DELETE'));
select uji.cek((select status from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000002') = 'menunggu', 'pulihkan oleh bendahara: pengeluaran besar kembali MENUNGGU persetujuan Ketua');
select uji.cek((select disetujui_oleh from public.transaksi_kas where id = 'c0000000-0000-0000-0000-000000000002') is null, 'pulihkan oleh bendahara: tidak mewarisi persetujuan lama');
select uji.kembali();

-- ---------------------------------------------------------------------
-- 5. Kekebalan log audit terhadap superuser (trigger) dan kebocoran antar warga
-- ---------------------------------------------------------------------
select uji.harus_gagal($q$update public.audit_log set tabel = 'x'$q$, 'trigger menolak UBAH log audit walau oleh superuser', '42501');
select uji.harus_gagal($q$delete from public.audit_log$q$, 'trigger menolak HAPUS log audit walau oleh superuser', '42501');

select uji.sebagai('a0000000-0000-0000-0000-000000000005');
select uji.cek((select count(*) from public.tagihan_ipl) = 1, 'warga B hanya melihat tagihan rumahnya');
select uji.cek((select count(*) from public.transaksi_kas where status = 'menunggu') = 0, 'warga tidak melihat pengeluaran yang masih menunggu');
select uji.cek((public.ringkasan_transaksi() ->> 'jumlah')::int = (select count(*) from public.transaksi_kas), 'ringkasan_transaksi warga mengikuti RLS');
select uji.kembali();


-- ---------------------------------------------------------------------
-- 6. Laporan tunggakan & tagihan otomatis (migrasi 09)
-- ---------------------------------------------------------------------
-- Data: rumah A punya 2 tagihan lama belum bayar, 1 lunas, 1 menunggu verifikasi (tidak dihitung)
delete from public.tagihan_ipl where rumah_id = (select rumah_id from public.warga where id = 'a0000000-0000-0000-0000-000000000004') and periode >= '2026-01-01';
insert into public.tagihan_ipl (rumah_id, periode, nominal, status)
  select w.rumah_id, p.periode, 100000, p.status
  from public.warga w, (values ('2020-01-01'::date, 'belum_bayar'), ('2020-02-01', 'belum_bayar'), ('2020-03-01', 'lunas'), ('2020-04-01', 'menunggu_verifikasi')) p(periode, status)
  where w.id = 'a0000000-0000-0000-0000-000000000004';
update public.warga_kontak set nomor_hp = '6281234567890' where warga_id = 'a0000000-0000-0000-0000-000000000004';

select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select uji.cek((select count(*) from public.tunggakan_ipl()) = 0, 'warga biasa tidak dapat memakai laporan tunggakan (hasil kosong)');
select uji.kembali();

select uji.sebagai('a0000000-0000-0000-0000-000000000002');
select uji.cek((select count(*) from public.tunggakan_ipl()) = 0, 'Wakil Ketua bukan bendahara: laporan tunggakan kosong');
select uji.kembali();

select uji.sebagai('a0000000-0000-0000-0000-000000000003');
select uji.cek((select jumlah_bulan from public.tunggakan_ipl() where kode = 'A-10') = 2, 'tunggakan: hanya belum_bayar lewat jatuh tempo yang dihitung (lunas & diperiksa tidak)');
select uji.cek((select total from public.tunggakan_ipl() where kode = 'A-10') = 200000, 'tunggakan: total nominal benar');
select uji.cek((select periode_tertua from public.tunggakan_ipl() where kode = 'A-10') = '2020-01-01', 'tunggakan: periode tertua benar');
select uji.cek((select nama from public.tunggakan_ipl() where kode = 'A-10') = 'Warga Rumah A', 'tunggakan: nama kepala keluarga/penghuni terbaca');
select uji.cek((select nomor_hp from public.tunggakan_ipl() where kode = 'A-10') = '6281234567890', 'tunggakan: nomor HP terbaca oleh bendahara untuk pengingat');
select uji.harus_gagal($q$select public.buat_tagihan_otomatis()$q$, 'bendahara tidak dapat memanggil buat_tagihan_otomatis langsung', '42501');
select uji.kembali();

-- Tagihan otomatis: mati bawaan, hidup bila saklar dinyalakan, tidak ganda
do $q$
declare v_periode date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date; v_harap int; v_hasil int;
begin
  perform uji.cek(public.buat_tagihan_otomatis() = 0, 'tagihan otomatis: saklar mati = tidak membuat apa pun');
  update public.pengaturan set tagihan_otomatis = true where id = 1;
  select count(*) into v_harap from public.rumah r where r.status = 'dihuni'
    and not exists (select 1 from public.tagihan_ipl t where t.rumah_id = r.id and t.periode = v_periode);
  v_hasil := public.buat_tagihan_otomatis();
  perform uji.cek(v_hasil = v_harap and v_hasil > 0, 'tagihan otomatis: menerbitkan untuk rumah dihuni yang belum punya tagihan bulan ini');
  perform uji.cek(public.buat_tagihan_otomatis() = 0, 'tagihan otomatis: dijalankan ulang tidak membuat tagihan ganda');
  perform uji.cek((select count(*) from public.notifikasi where jenis = 'ipl' and judul like 'Tagihan IPL%') > 0, 'tagihan otomatis: warga menerima notifikasi');
end $q$;

-- ---------------------------------------------------------------------
-- 7. Polling warga & rekap alamat (migrasi 10)
-- ---------------------------------------------------------------------
create table uji.kv (k text primary key, v text);
grant all on uji.kv to public;
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('a0000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'wargaa2@uji.local', '{"nama":"Warga Rumah A (2)"}');
update public.warga set status = 'aktif', blok = 'A', no_rumah = '10' where id = 'a0000000-0000-0000-0000-000000000006';

-- hak membuat polling
select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select uji.harus_gagal($q$select public.buat_polling('Cat pagar', null, array['Putih','Hijau'], now() + interval '2 days')$q$, 'warga biasa tidak dapat membuat polling', '42501');
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000003');
select uji.harus_gagal($q$select public.buat_polling('Cat pagar', null, array['Putih','Hijau'], now() + interval '2 days')$q$, 'bendahara (bukan pengelola info) tidak dapat membuat polling', '42501');
select uji.kembali();

-- validasi pembuatan
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
select uji.harus_gagal($q$select public.buat_polling('Satu pilihan', null, array['Ya'], now() + interval '2 days')$q$, 'polling dengan satu pilihan ditolak');
select uji.harus_gagal($q$select public.buat_polling('Pilihan ganda sama', null, array['Ya','ya'], now() + interval '2 days')$q$, 'pilihan kembar ditolak');
select uji.harus_gagal($q$select public.buat_polling('Sudah lewat', null, array['Ya','Tidak'], now() - interval '1 day')$q$, 'batas waktu lampau ditolak');

insert into uji.kv select 'p1', public.buat_polling('Iuran keamanan naik?', 'Usulan kenaikan Rp 10.000', array['Setuju','Tidak'], now() + interval '2 days', 'A');
select uji.cek((select count(*) from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1')) = 2, 'polling dibuat beserta pilihannya');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'a0000000-0000-0000-0000-000000000001' and judul = 'Polling baru') = 0, 'pembuat tidak menerima notifikasi polling sendiri');
select uji.kembali();
select uji.cek((select count(*) from public.notifikasi where warga_id = 'a0000000-0000-0000-0000-000000000004' and judul = 'Polling baru') = 1, 'warga di sasaran menerima notifikasi polling');
select uji.cek((select count(*) from public.notifikasi where warga_id = 'a0000000-0000-0000-0000-000000000005' and judul = 'Polling baru') = 0, 'warga di luar sasaran tidak diberi notifikasi');

-- sasaran: warga blok B tidak melihat dan tidak bisa memilih
select uji.sebagai('a0000000-0000-0000-0000-000000000005');
select uji.cek((select count(*) from public.polling) = 0, 'warga blok B tidak melihat polling blok A');
select uji.cek(jsonb_array_length(public.daftar_polling()) = 0, 'daftar_polling kosong untuk warga di luar sasaran');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi limit 1)])$q$, 'warga di luar sasaran tidak dapat memilih', '42501');
select uji.kembali();

-- warga A: hasil tersembunyi sebelum memilih; suara tidak bisa diakses langsung
select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select uji.cek((public.daftar_polling() -> 0 ->> 'hasil_terlihat')::boolean = false, 'hasil disembunyikan sebelum memilih');
select uji.cek((public.daftar_polling() -> 0 -> 'opsi' -> 0 ->> 'jumlah') is null, 'jumlah per pilihan tidak bocor sebelum memilih');
select uji.harus_gagal($q$select count(*) from public.polling_suara$q$, 'tabel suara tidak dapat dibaca langsung', '42501');
select uji.harus_gagal($q$insert into public.polling_suara (polling_id, opsi_id, warga_id) select polling_id, id, auth.uid() from public.polling_opsi limit 1$q$, 'suara tidak dapat disisipkan langsung', '42501');
select uji.harus_gagal($q$update public.polling set tutup_at = now() + interval '90 days'$q$, 'polling tidak dapat diubah langsung', '42501');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[gen_random_uuid()])$q$, 'pilihan palsu ditolak');
select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1') and urutan = 1)]);
select uji.cek((public.daftar_polling() -> 0 ->> 'sudah_memilih')::boolean, 'status sudah memilih terbaca');
select uji.cek((public.daftar_polling() -> 0 -> 'opsi' -> 0 ->> 'jumlah')::int = 1, 'setelah memilih, hasil terlihat');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1') and urutan = 2)])$q$, 'tidak dapat memilih dua kali', '23505');
select uji.kembali();

-- satu rumah satu suara
select uji.sebagai('a0000000-0000-0000-0000-000000000006');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1') and urutan = 2)])$q$, 'anggota rumah yang sama tidak dapat memberi suara kedua', '23505');
select uji.kembali();

-- pilihan ganda pada polling satu pilihan ditolak; Ketua memilih
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), (select array_agg(id) from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1')))$q$, 'polling satu pilihan menolak dua pilihan sekaligus');
select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1') and urutan = 2)]);
select uji.cek((public.daftar_polling() -> 0 ->> 'hak_suara')::int = 4, 'hak suara = jumlah rumah aktif di sasaran (4 rumah blok A)');
select uji.cek((public.daftar_polling() -> 0 ->> 'pemilih')::int = 2, 'jumlah pemilih (rumah) benar');
select uji.kembali();

-- bendahara tidak memilih -> hasil tetap tersembunyi; Wakil (pengelola) boleh melihat
select uji.sebagai('a0000000-0000-0000-0000-000000000003');
select uji.cek((public.daftar_polling() -> 0 ->> 'hasil_terlihat')::boolean = false, 'peserta yang belum memilih tidak melihat hasil');
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000002');
select uji.cek((public.daftar_polling() -> 0 ->> 'hasil_terlihat')::boolean, 'pengelola sasaran dapat memantau hasil');
select uji.kembali();

-- menutup polling
select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select uji.harus_gagal($q$select public.tutup_polling((select v::uuid from uji.kv where k = 'p1'))$q$, 'warga bukan pembuat tidak dapat menutup polling', '42501');
select uji.harus_gagal($q$select public.hapus_polling((select v::uuid from uji.kv where k = 'p1'))$q$, 'warga bukan pembuat tidak dapat menghapus polling', '42501');
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
select public.tutup_polling((select v::uuid from uji.kv where k = 'p1'));
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000003');
select uji.cek((public.daftar_polling() -> 0 ->> 'selesai')::boolean and (public.daftar_polling() -> 0 ->> 'hasil_terlihat')::boolean, 'setelah ditutup hasil terlihat oleh semua peserta');
select uji.harus_gagal($q$select public.beri_suara((select v::uuid from uji.kv where k = 'p1'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p1') and urutan = 1)])$q$, 'polling yang sudah ditutup menolak suara baru');
select uji.kembali();

-- polling pilihan ganda, satu warga satu suara
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
insert into uji.kv select 'p2', public.buat_polling('Kegiatan 17 Agustus', null, array['Lomba anak','Jalan sehat','Bazar'], now() + interval '3 days', null, null, true, false);
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select public.beri_suara((select v::uuid from uji.kv where k = 'p2'), (select array_agg(id) from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p2') and urutan <= 2));
select uji.kembali();
select uji.sebagai('a0000000-0000-0000-0000-000000000006');
select public.beri_suara((select v::uuid from uji.kv where k = 'p2'), array[(select id from public.polling_opsi where polling_id = (select v::uuid from uji.kv where k = 'p2') and urutan = 3)]);
select uji.cek((select (x ->> 'pemilih')::int from jsonb_array_elements(public.daftar_polling()) x where x ->> 'id' = (select v from uji.kv where k = 'p2')) = 2, 'per warga: dua anggota satu rumah masing-masing satu suara');
select uji.cek((select sum((o ->> 'jumlah')::int) from jsonb_array_elements(public.daftar_polling()) x, jsonb_array_elements(x -> 'opsi') o where x ->> 'id' = (select v from uji.kv where k = 'p2')) = 3, 'pilihan ganda: total suara = 3');
select uji.kembali();

-- hapus polling oleh pembuat
select uji.sebagai('a0000000-0000-0000-0000-000000000001');
select public.hapus_polling((select v::uuid from uji.kv where k = 'p2'));
select uji.kembali();
select uji.cek((select count(*) from public.polling_suara where polling_id = (select v::uuid from uji.kv where k = 'p2')) = 0, 'hapus polling ikut menghapus suara');

-- rekap alamat: blok, sub_blok, nomor terpisah
update public.warga set no_rumah = '3/5' where id = 'a0000000-0000-0000-0000-000000000002';
select uji.cek((select sub_blok || '|' || nomor from public.rekap_warga where id = 'a0000000-0000-0000-0000-000000000002') = '3|5', 'rekap_warga: "3/5" dipecah jadi sub_blok 3, nomor 5');
select uji.cek((select sub_blok is null and nomor = '3' from public.rekap_warga where id = 'a0000000-0000-0000-0000-000000000003'), 'rekap_warga: nomor tanpa sub-blok');
select uji.cek((select sub_blok || '|' || nomor from public.rekap_rumah where kode = 'A-3/5') = '3|5', 'rekap_rumah: kode A-3/5 dipecah');
select uji.sebagai('a0000000-0000-0000-0000-000000000004');
select uji.cek((select count(*) from public.rekap_warga) > 0, 'rekap_warga dapat dibaca (mengikuti RLS)');
select uji.kembali();

rollback;
\o
\echo
\echo '=== SEMUA UJI RLS LULUS ==='
