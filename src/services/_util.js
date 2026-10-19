/** Lempar galat Supabase bila ada, kembalikan data. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/**
 * Ambil SEMUA baris dengan membaca per halaman (batas bawaan Supabase 1000 baris per permintaan).
 * `buat` harus mengembalikan query baru setiap dipanggil dan memakai urutan yang pasti
 * (tambahkan .order('id') sebagai pembeda) supaya tidak ada baris terlewat atau ganda antar halaman.
 */
export async function ambilSemua(buat, ukuran = 1000, maks = 20000) {
  const hasil = [];
  for (let dari = 0; dari < maks; dari += ukuran) {
    const rows = unwrap(await buat().range(dari, dari + ukuran - 1));
    hasil.push(...rows);
    if (rows.length < ukuran) break;
  }
  return hasil;
}

/** Jalankan pencarian `.in()` per potongan agar URL tidak terlalu panjang; gabungkan hasilnya. */
export async function perPotong(ids, fn, ukuran = 100) {
  const hasil = [];
  for (let i = 0; i < ids.length; i += ukuran) hasil.push(...(await fn(ids.slice(i, i + ukuran))));
  return hasil;
}
