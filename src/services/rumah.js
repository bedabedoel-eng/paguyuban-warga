import { supabase } from '../lib/supabase';
import { unwrap, ambilSemua } from './_util';

export const daftarRumah = async () => ambilSemua(() => supabase.from('rumah').select('*').order('blok').order('nomor').order('id'));
export const simpanRumah = async (r) => {
  const { id, kode, created_at, ...data } = r;
  return unwrap(id
    ? await supabase.from('rumah').update(data).eq('id', id).select().single()
    : await supabase.from('rumah').insert(data).select().single());
};
export const hapusRumah = async (id) => unwrap(await supabase.from('rumah').delete().eq('id', id));
