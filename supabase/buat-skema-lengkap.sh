#!/usr/bin/env bash
# Menyusun supabase/skema-lengkap.sql = gabungan berurutan semua migrasi bernomor (01, 02, ... terakhir).
# Jalankan ulang SETIAP kali menambah migrasi baru:  bash supabase/buat-skema-lengkap.sh
# Hasilnya diuji sama dengan menjalankan migrasi satu per satu oleh supabase/tests/uji-skema-lengkap.sh.
set -euo pipefail
cd "$(dirname "$0")"
OUT=skema-lengkap.sql
FILES=( [0-9][0-9]-*.sql )
{
  echo "-- ====================================================================="
  echo "-- SKEMA LENGKAP TERKINI (instalasi baru) - DIHASILKAN OTOMATIS, JANGAN DIUBAH TANGAN."
  echo "-- Gabungan berurutan: ${FILES[*]}"
  echo "-- Dibuat oleh supabase/buat-skema-lengkap.sh. Untuk mengubah skema, buat migrasi bernomor baru lalu jalankan ulang skrip itu."
  echo "--"
  echo "-- PEMAKAIAN:"
  echo "--  * Proyek Supabase BARU/KOSONG: jalankan berkas ini SEKALI di SQL Editor (satu berkas, tanpa migrasi lain)."
  echo "--  * Proyek yang SUDAH BERJALAN: JANGAN pakai berkas ini; jalankan hanya migrasi bernomor yang belum pernah"
  echo "--    dijalankan, berurutan (lihat DAFTAR-MIGRASI.md dan cek-migrasi.sql)."
  echo "-- Berkas ini memuat data awal contoh dari 02-data-awal.sql; sesuaikan di aplikasi sesudahnya."
  echo "-- ====================================================================="
  echo
  for f in "${FILES[@]}"; do
    echo "-- #####################################################################"
    echo "-- ##  BERKAS: $f"
    echo "-- #####################################################################"
    cat "$f"
    echo
  done
} > "$OUT"
echo "Ditulis supabase/$OUT (${#FILES[@]} migrasi, $(wc -l < "$OUT") baris)"
