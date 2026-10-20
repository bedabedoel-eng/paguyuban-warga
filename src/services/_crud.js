import { supabase } from '../lib/supabase';
import { unwrap, ambilSemua } from './_util';

/**
 * Pabrik layanan data sederhana (daftar, simpan, hapus) untuk satu tabel Supabase.
 * Menggantikan pola yang sama yang sebelumnya ditulis ulang di tiap berkas layanan.
 *
 * opsi:
 *   tabel   nama tabel
 *   pilih   isi select (bawaan '*', boleh memuat relasi, mis. '*, warga:warga_id(id,nama)')
 *   urut    kolom pengurutan daftar, mis. ['blok', 'nomor']; 'id' selalu ditambahkan di akhir
 *           agar pembacaan per halaman Supabase tidak melewatkan atau menggandakan baris
 *   buang   kolom yang tidak boleh ikut dikirim saat simpan (turunan/relasi/otomatis)
 *   kunci   kolom kunci utama (bawaan 'id')
 */
export function buatLayanan({ tabel, pilih = '*', urut = [], buang = [], kunci = 'id' }) {
  const dari = () => supabase.from(tabel);
  const bersih = (baris) => {
    const data = { ...baris };
    for (const k of [kunci, 'created_at', ...buang]) delete data[k];
    return data;
  };

  return {
    /** Semua baris (dibaca per halaman 1000). */
    daftar: () => ambilSemua(() => urut.reduce((q, k) => q.order(k), dari().select(pilih)).order(kunci)),

    /** Tambah bila baris belum punya kunci, ubah bila sudah. */
    simpan: async (baris) => {
      const data = bersih(baris);
      return unwrap(baris[kunci]
        ? await dari().update(data).eq(kunci, baris[kunci]).select().single()
        : await dari().insert(data).select().single());
    },

    /** Ubah sebagian kolom satu baris (mis. { aktif: false }). Galat bila tidak ada baris yang berubah (RLS menolak dengan diam). */
    ubahSebagian: async (id, data) => {
      const rows = unwrap(await dari().update(data).eq(kunci, id).select(kunci));
      if (!rows?.length) throw new Error('Data tidak berubah. Anda mungkin tidak berwenang atau data sudah tidak ada.');
      return rows[0];
    },

    /**
     * Hapus satu baris. RLS Supabase menolak dengan DIAM (0 baris terhapus, tanpa galat),
     * jadi jumlah baris yang benar-benar terhapus diperiksa agar pengguna tidak
     * melihat "berhasil" padahal tidak ada yang terhapus.
     */
    hapus: async (id) => {
      const rows = unwrap(await dari().delete().eq(kunci, id).select(kunci));
      if (!rows?.length) throw new Error('Data tidak terhapus. Anda mungkin tidak berwenang atau data sudah tidak ada.');
      return rows;
    },
  };
}
