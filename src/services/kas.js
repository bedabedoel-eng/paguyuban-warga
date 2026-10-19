import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const ringkasanKas = async (bulan) => unwrap(await supabase.rpc('ringkasan_kas', { p_bulan: bulan }));
export const arusKasBulanan = async (tahun) => unwrap(await supabase.rpc('arus_kas_bulanan', { p_tahun: tahun }));

const SEL_TRX = '*, pencatat:dibuat_oleh(nama), penyetuju:disetujui_oleh(nama)';

/** Satu halaman transaksi: { rows, total } (total = semua baris yang cocok filter). */
export async function transaksiHalaman({ jenis = '', status = '', batas = 100, dari, sampai, diputuskan = false } = {}) {
  let q = supabase.from('transaksi_kas').select(SEL_TRX, { count: 'exact' });
  q = diputuskan
    ? q.order('disetujui_at', { ascending: false, nullsFirst: false })
    : q.order('tanggal', { ascending: false });
  q = q.order('created_at', { ascending: false }).order('id').range(0, batas - 1);
  if (jenis) q = q.eq('jenis', jenis);
  if (status) q = q.eq('status', status);
  if (dari) q = q.gte('tanggal', dari);
  if (sampai) q = q.lte('tanggal', sampai);
  const r = await q;
  if (r.error) throw r.error;
  return { rows: r.data, total: r.count ?? r.data.length };
}

export async function daftarTransaksi(opsi = {}) {
  const { limit, ...lain } = opsi;
  return (await transaksiHalaman({ ...lain, batas: limit || 200 })).rows;
}

/** Jumlah baris + total masuk/keluar (disetujui) untuk filter yang sama, tidak terpengaruh paginasi. */
export async function ringkasanTransaksi({ jenis = '', dari, sampai } = {}) {
  return unwrap(await supabase.rpc('ringkasan_transaksi', { p_jenis: jenis || null, p_dari: dari || null, p_sampai: sampai || null }));
}

/* ----- Riwayat perubahan (log audit) ----- */
export async function riwayatAudit({ batas = 50, aksi = '' } = {}) {
  let q = supabase.from('audit_log').select('*', { count: 'exact' }).eq('tabel', 'transaksi_kas')
    .order('waktu', { ascending: false }).order('id', { ascending: false }).range(0, batas - 1);
  if (aksi) q = q.eq('aksi', aksi);
  const r = await q;
  if (r.error) throw r.error;
  return { rows: r.data, total: r.count ?? r.data.length };
}
export const pulihkanTransaksi = async (auditId) => unwrap(await supabase.rpc('pulihkan_transaksi', { p_audit_id: auditId }));

export async function simpanTransaksi(t) {
  const { id, pencatat, penyetuju, ...data } = t;
  return unwrap(id
    ? await supabase.from('transaksi_kas').update(data).eq('id', id).select().single()
    : await supabase.from('transaksi_kas').insert(data).select().single());
}
export const hapusTransaksi = async (id) => unwrap(await supabase.from('transaksi_kas').delete().eq('id', id));
export const putuskanPengeluaran = async (id, setuju, alasan) =>
  unwrap(await supabase.rpc('putuskan_pengeluaran', { p_id: id, p_setuju: setuju, p_alasan: alasan || null }));
