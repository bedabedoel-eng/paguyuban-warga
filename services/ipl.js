import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export async function tagihanRumah(rumahId) {
  if (!rumahId) return [];
  return unwrap(await supabase.from('tagihan_ipl').select('*').eq('rumah_id', rumahId).order('periode', { ascending: false }).limit(60));
}

export async function pembayaranSaya(rumahId) {
  if (!rumahId) return [];
  return unwrap(await supabase.from('pembayaran_ipl').select('*').eq('rumah_id', rumahId).order('created_at', { ascending: false }).limit(30));
}

export const kirimPembayaran = async (ids, buktiPath, catatan) =>
  unwrap(await supabase.rpc('kirim_pembayaran', { p_tagihan: ids, p_bukti_path: buktiPath, p_catatan: catatan || null }));

/* ----- Bendahara ----- */
export const buatTagihan = async (periode) => unwrap(await supabase.rpc('buat_tagihan_ipl', { p_periode: periode }));

export async function tagihanPeriode(periode) {
  return unwrap(await supabase.from('tagihan_ipl').select('*, rumah:rumah_id(kode,blok,nomor)').eq('periode', periode).order('created_at').limit(2000));
}

export async function periodeTersedia() {
  const rows = unwrap(await supabase.from('tagihan_ipl').select('periode').order('periode', { ascending: false }).limit(5000));
  return [...new Set(rows.map((r) => r.periode))];
}

export async function pembayaranMenunggu() {
  const rows = unwrap(await supabase.from('pembayaran_ipl').select('*, rumah:rumah_id(kode), warga:warga_id(nama)').eq('status', 'menunggu').order('created_at'));
  const ids = rows.map((r) => r.id);
  const t = ids.length ? unwrap(await supabase.from('tagihan_ipl').select('id,periode,nominal,pembayaran_id').in('pembayaran_id', ids)) : [];
  return rows.map((r) => ({ ...r, tagihan: t.filter((x) => x.pembayaran_id === r.id) }));
}

export const verifikasiPembayaran = async (id, terima, alasan) =>
  unwrap(await supabase.rpc('verifikasi_pembayaran', { p_id: id, p_terima: terima, p_alasan: alasan || null }));
export const tandaiLunasTunai = async (id) => unwrap(await supabase.rpc('tandai_lunas_tunai', { p_tagihan: id }));
export const hapusTagihan = async (id) => unwrap(await supabase.from('tagihan_ipl').delete().eq('id', id).eq('status', 'belum_bayar'));
