import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const ringkasanKas = async (bulan) => unwrap(await supabase.rpc('ringkasan_kas', { p_bulan: bulan }));
export const arusKasBulanan = async (tahun) => unwrap(await supabase.rpc('arus_kas_bulanan', { p_tahun: tahun }));

export async function daftarTransaksi({ jenis = '', status = '', limit = 200, dari, sampai } = {}) {
  let q = supabase.from('transaksi_kas').select('*, pencatat:dibuat_oleh(nama), penyetuju:disetujui_oleh(nama)')
    .order('tanggal', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (jenis) q = q.eq('jenis', jenis);
  if (status) q = q.eq('status', status);
  if (dari) q = q.gte('tanggal', dari);
  if (sampai) q = q.lte('tanggal', sampai);
  return unwrap(await q);
}

export async function simpanTransaksi(t) {
  const { id, pencatat, penyetuju, ...data } = t;
  return unwrap(id
    ? await supabase.from('transaksi_kas').update(data).eq('id', id).select().single()
    : await supabase.from('transaksi_kas').insert(data).select().single());
}
export const hapusTransaksi = async (id) => unwrap(await supabase.from('transaksi_kas').delete().eq('id', id));
export const putuskanPengeluaran = async (id, setuju, alasan) =>
  unwrap(await supabase.rpc('putuskan_pengeluaran', { p_id: id, p_setuju: setuju, p_alasan: alasan || null }));
