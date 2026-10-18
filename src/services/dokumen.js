import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

const KOLOM = '*, pembuat:dibuat_oleh(nama)';

export async function daftarDokumen({ jenis = '', q = '', limit = 200 } = {}) {
  let query = supabase.from('dokumen').select(KOLOM).order('tanggal', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (jenis) query = query.eq('jenis', jenis);
  if (q) query = query.ilike('judul', `%${q.replace(/[%_,()]/g, ' ')}%`);
  return unwrap(await query);
}
export const detailDokumen = async (id) => unwrap(await supabase.from('dokumen').select(KOLOM).eq('id', id).single());
export async function simpanDokumen(d) {
  const { id, pembuat, created_at, updated_at, dibuat_oleh, ...data } = d;
  return unwrap(id
    ? await supabase.from('dokumen').update(data).eq('id', id).select().single()
    : await supabase.from('dokumen').insert(data).select().single());
}
export const hapusDokumen = async (id) => unwrap(await supabase.from('dokumen').delete().eq('id', id));
