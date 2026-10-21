#!/usr/bin/env bash
# Membuktikan skema-lengkap.sql SAMA dengan menjalankan migrasi bernomor satu per satu.
# Butuh dua database Postgres KOSONG (lokal/CI), mis.:
#   PGURL_A="postgresql://postgres@localhost:5432/uji_a" PGURL_B="postgresql://postgres@localhost:5432/uji_b" ./supabase/tests/uji-skema-lengkap.sh
# Langkah: (1) tiruan Supabase di A dan B, (2) A <- 01..N berurutan, B <- skema-lengkap.sql, (3) bandingkan pg_dump skema.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PGURL_A:?isi PGURL_A}"; : "${PGURL_B:?isi PGURL_B}"
bash buat-skema-lengkap.sh >/dev/null
for U in "$PGURL_A" "$PGURL_B"; do psql "$U" -v ON_ERROR_STOP=1 -X -q -f tests/00-stub-supabase.sql; done
for f in [0-9][0-9]-*.sql; do psql "$PGURL_A" -v ON_ERROR_STOP=1 -X -q -f "$f" >/dev/null 2>&1; done
psql "$PGURL_B" -v ON_ERROR_STOP=1 -X -q -f skema-lengkap.sql >/dev/null 2>&1
DUMP=(pg_dump --schema-only --no-owner --no-privileges --no-comments)
"${DUMP[@]}" "$PGURL_A" | grep -v '^-- Dumped\|^\\\(un\)\?restrict' > /tmp/skema_a.sql
"${DUMP[@]}" "$PGURL_B" | grep -v '^-- Dumped\|^\\\(un\)\?restrict' > /tmp/skema_b.sql
diff -u /tmp/skema_a.sql /tmp/skema_b.sql && echo "SKEMA LENGKAP SAMA DENGAN MIGRASI BERURUTAN"
# data awal (02) juga harus sama
for T in public.pengaturan public.blok public.gang public.kontak_darurat; do
  a=$(psql "$PGURL_A" -Atc "select count(*) from $T"); b=$(psql "$PGURL_B" -Atc "select count(*) from $T")
  [ "$a" = "$b" ] || { echo "Jumlah baris $T berbeda: $a vs $b"; exit 1; }
done
echo "DATA AWAL SAMA"
