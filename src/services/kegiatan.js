import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

const KOLOM = '*, peserta:kegiatan_peserta(warga_id)';

export async function daftarKegiatan({ selesai = false, dari, sampai, limit = 100 } = {}) {
  let q = supabase.from('kegiatan').select(KOLOM).limit(limit);
  const now = new Date().toISOString();
  if (dari || sampai) {
    if (dari) q = q.gte('mulai', dari);
    if (sampai) q = q.lt('mulai', sampai);
    q = q.order('mulai');
  } else if (selesai) q = q.lt('selesai', now).order('mulai', { ascending: false });
  else q = q.gte('selesai', now).order('mulai');
  return unwrap(await q);
}
export const detailKegiatan = async (id) => unwrap(await supabase.from('kegiatan').select('*, peserta:kegiatan_peserta(warga_id, warga:warga_id(nama,foto_path,blok,no_rumah,gang_id))').eq('id', id).single());
export async function simpanKegiatan(k) {
  const { id, peserta, created_at, dibuat_oleh, ...data } = k;
  return unwrap(id
    ? await supabase.from('kegiatan').update(data).eq('id', id).select().single()
    : await supabase.from('kegiatan').insert(data).select().single());
}
export const hapusKegiatan = async (id) => unwrap(await supabase.from('kegiatan').delete().eq('id', id));
export const daftarIkut = async (id) => unwrap(await supabase.from('kegiatan_peserta').insert({ kegiatan_id: id }));
export const batalIkut = async (id, uid) => unwrap(await supabase.from('kegiatan_peserta').delete().eq('kegiatan_id', id).eq('warga_id', uid));
