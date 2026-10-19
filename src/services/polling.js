import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

/** Semua polling yang boleh dilihat pengguna, lengkap dengan hasil (bila sudah boleh dilihat). null bila migrasi 10 belum dijalankan. */
export async function daftarPolling(batas = 50) {
  const r = await supabase.rpc('daftar_polling', { p_batas: batas });
  if (r.error) {
    if (r.error.code === 'PGRST202' || r.error.code === '42883') return null;
    throw r.error;
  }
  return r.data || [];
}

export const buatPolling = async ({ judul, deskripsi, opsi, tutup, blok, gang, pilihBanyak, perRumah }) =>
  unwrap(await supabase.rpc('buat_polling', {
    p_judul: judul, p_deskripsi: deskripsi || null, p_opsi: opsi, p_tutup: tutup,
    p_blok: blok || null, p_gang: gang || null, p_pilih_banyak: !!pilihBanyak, p_per_rumah: perRumah !== false,
  }));
export const beriSuara = async (id, opsiIds) => unwrap(await supabase.rpc('beri_suara', { p_polling: id, p_opsi: opsiIds }));
export const tutupPolling = async (id) => unwrap(await supabase.rpc('tutup_polling', { p_id: id }));
export const hapusPolling = async (id) => unwrap(await supabase.rpc('hapus_polling', { p_id: id }));
