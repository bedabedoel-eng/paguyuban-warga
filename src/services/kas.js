import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const ringkasanKas = async (bulan) => unwrap(await supabase.rpc('ringkasan_kas', { p_bulan: bulan }));

export async function daftarTransaksi({ jenis = '', limit = 100, dari, sampai } = {}) {
  let q = supabase.from('transaksi_kas').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (jenis) q = q.eq('jenis', jenis);
  if (dari) q = q.gte('tanggal', dari);
  if (sampai) q = q.lte('tanggal', sampai);
  return unwrap(await q);
}

export async function simpanTransaksi(t) {
  const { id, ...data } = t;
  return unwrap(id
    ? await supabase.from('transaksi_kas').update(data).eq('id', id).select().single()
    : await supabase.from('transaksi_kas').insert(data).select().single());
}
export const hapusTransaksi = async (id) => unwrap(await supabase.from('transaksi_kas').delete().eq('id', id));
