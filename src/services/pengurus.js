import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export async function daftarPengurus({ semua = false } = {}) {
  let q = supabase.from('pengurus').select('*, warga:warga_id(id,nama,blok,no_rumah,gang_id,foto_path)').order('urutan').order('created_at');
  if (!semua) q = q.eq('aktif', true);
  return unwrap(await q);
}
export async function simpanPengurus(p) {
  const { id, warga, created_at, ...data } = p;
  return unwrap(id
    ? await supabase.from('pengurus').update(data).eq('id', id).select().single()
    : await supabase.from('pengurus').insert(data).select().single());
}
export const hapusPengurus = async (id) => unwrap(await supabase.from('pengurus').delete().eq('id', id));
