import { supabase } from '../lib/supabase';
import { unwrap } from './_util';
import { buatLayanan } from './_crud';

export async function daftarPengurus({ semua = false } = {}) {
  let q = supabase.from('pengurus').select('*, warga:warga_id(id,nama,blok,no_rumah,gang_id,foto_path)').order('urutan').order('created_at');
  if (!semua) q = q.eq('aktif', true);
  return unwrap(await q);
}

// `warga` adalah relasi hasil join, bukan kolom, jadi tidak ikut dikirim saat simpan.
const pengurus = buatLayanan({ tabel: 'pengurus', buang: ['warga'] });
export const simpanPengurus = pengurus.simpan;
export const hapusPengurus = pengurus.hapus;
export const ubahPengurus = pengurus.ubahSebagian;
