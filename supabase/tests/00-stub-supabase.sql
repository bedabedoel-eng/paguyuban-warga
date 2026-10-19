-- =====================================================================
-- TIRUAN MINIMAL SUPABASE untuk pengujian di Postgres biasa (lokal / CI).
-- JANGAN dijalankan di proyek Supabase sungguhan: skema auth/storage dan peran
-- sudah tersedia di sana. Hanya meniru bagian yang dipakai oleh supabase/*.sql.
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;
create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud text, role text, email text unique, encrypted_password text, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz default now(), updated_at timestamptz default now(),
  confirmation_token text, email_change text, email_change_token_new text, recovery_token text
);
create table if not exists auth.identities (
  provider_id text, user_id uuid references auth.users(id) on delete cascade, identity_data jsonb, provider text,
  last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
-- Seperti Supabase: identitas diambil dari klaim JWT yang dipasang PostgREST per permintaan.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/')
$$;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
grant execute on all functions in schema extensions to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
-- Samakan perilaku Supabase: objek baru di schema public otomatis bisa diakses peran API (RLS yang membatasi).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
