import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const buatLaporan = async (l) => unwrap(await supabase.from('laporan').insert(l).select().single());
export async function laporanSaya(uid) {
  return unwrap(await supabase.from('laporan').select('*').eq('pelapor_id', uid).order('created_at', { ascending: false }).limit(50));
}
/** Semua laporan yang boleh dilihat (RLS: pimpinan semua, humas gangnya). */
export async function semuaLaporan({ status = '' } = {}) {
  let q = supabase.from('laporan').select('*, pelapor:pelapor_id(nama,blok,no_rumah,gang_id,foto_path)').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  return unwrap(await q);
}
export const tanggapiLaporan = async (id, data) => unwrap(await supabase.from('laporan').update(data).eq('id', id).select().single());
export const hapusLaporan = async (id) => unwrap(await supabase.from('laporan').delete().eq('id', id));
