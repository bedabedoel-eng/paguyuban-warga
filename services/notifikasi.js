import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export async function daftarNotifikasi({ belum = false, limit = 50 } = {}) {
  let q = supabase.from('notifikasi').select('*').order('created_at', { ascending: false }).limit(limit);
  if (belum) q = q.is('dibaca_at', null);
  return unwrap(await q);
}
export async function jumlahBelumDibaca() {
  const { count, error } = await supabase.from('notifikasi').select('id', { count: 'exact', head: true }).is('dibaca_at', null);
  if (error) throw error;
  return count || 0;
}
export const tandaiDibaca = async (ids = null) => unwrap(await supabase.rpc('tandai_dibaca', { p_ids: ids }));
export const hapusNotifikasi = async (id) => unwrap(await supabase.from('notifikasi').delete().eq('id', id));
