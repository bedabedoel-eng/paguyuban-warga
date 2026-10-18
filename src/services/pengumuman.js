import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

const KOLOM = '*, penulis:dibuat_oleh(nama)';

export async function daftarPengumuman({ kategori = '', limit = 50 } = {}) {
  let q = supabase.from('pengumuman').select(KOLOM).order('disematkan', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (kategori) q = q.eq('kategori', kategori);
  return unwrap(await q);
}
export const detailPengumuman = async (id) => unwrap(await supabase.from('pengumuman').select(KOLOM).eq('id', id).single());
export async function simpanPengumuman(p) {
  const { id, penulis, created_at, updated_at, dibuat_oleh, ...data } = p;
  return unwrap(id
    ? await supabase.from('pengumuman').update(data).eq('id', id).select().single()
    : await supabase.from('pengumuman').insert(data).select().single());
}
export const hapusPengumuman = async (id) => unwrap(await supabase.from('pengumuman').delete().eq('id', id));
