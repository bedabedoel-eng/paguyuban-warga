#!/usr/bin/env bash
# Menjalankan migrasi 01..09 + uji RLS pada database Postgres KOSONG (lokal/CI), bukan proyek Supabase sungguhan.
# Pemakaian:  PGURL="postgresql://postgres@localhost:5432/uji" ./supabase/tests/jalankan.sh
# Atau gunakan variabel libpq standar (PGHOST, PGPORT, PGUSER, PGDATABASE).
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL=(psql ${PGURL:+"$PGURL"} -v ON_ERROR_STOP=1 -X -q)
echo "› tiruan Supabase"; "${PSQL[@]}" -f tests/00-stub-supabase.sql
for f in 01-skema.sql 02-data-awal.sql 03-pin-angka.sql 04-import-warga.sql 05-struktur-pengurus.sql 06-nama-perumahan.sql 07-update-sensus-blok-ipl.sql 08-perbaikan-prioritas.sql 09-fitur-bendahara.sql; do
  echo "› $f"; "${PSQL[@]}" -f "$f"
done
echo "› uji RLS"; "${PSQL[@]}" -f tests/uji-rls.sql
echo "SEMUA UJI LULUS"
