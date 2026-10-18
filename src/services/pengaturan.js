import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const ambilPengaturan = async () => unwrap(await supabase.from('pengaturan').select('*').eq('id', 1).maybeSingle());
export const simpanPengaturan = async (data) => {
  const { id, updated_at, ...rest } = data;
  return unwrap(await supabase.from('pengaturan').update(rest).eq('id', 1).select().single());
};
export const daftarBlok = async () => unwrap(await supabase.from('blok').select('*').order('urutan').order('kode'));
export const simpanBlok = async (b) => unwrap(await supabase.from('blok').upsert(b).select().single());
export const hapusBlok = async (kode) => unwrap(await supabase.from('blok').delete().eq('kode', kode));
export const daftarKontakDarurat = async () => unwrap(await supabase.from('kontak_darurat').select('*').order('urutan').order('nama'));
export async function simpanKontakDarurat(k) {
  const { id, ...data } = k;
  return unwrap(id
    ? await supabase.from('kontak_darurat').update(data).eq('id', id).select().single()
    : await supabase.from('kontak_darurat').insert(data).select().single());
}
export const hapusKontakDarurat = async (id) => unwrap(await supabase.from('kontak_darurat').delete().eq('id', id));
