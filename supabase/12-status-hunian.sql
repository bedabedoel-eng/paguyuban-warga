-- 12 · Status hunian warga: rumah yang ditempati milik sendiri atau kontrak.
-- Disimpan di warga_kontak (data sensus) seperti status pernikahan, sehingga hanya
-- terbaca pemilik data dan pengurus berwenang. Aman dijalankan ulang. Tidak menghapus data.
alter table public.warga_kontak add column if not exists status_hunian text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kontak_status_hunian_check') then
    alter table public.warga_kontak add constraint kontak_status_hunian_check
      check (status_hunian is null or status_hunian in ('milik_sendiri', 'kontrak'));
  end if;
end $$;
