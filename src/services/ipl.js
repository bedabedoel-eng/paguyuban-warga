import { supabase } from '../lib/supabase';
import { unwrap, ambilSemua, perPotong } from './_util';

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
  return ambilSemua(() => supabase.from('tagihan_ipl').select('*, rumah:rumah_id(kode,blok,nomor)').eq('periode', periode).order('created_at').order('id'));
}

/** Daftar periode IPL (terbaru dulu). Memakai fungsi database; bila belum dipasang (migrasi 08), pakai cara lama. */
export async function periodeTersedia() {
  const r = await supabase.rpc('periode_ipl_tersedia');
  if (!r.error) return (r.data || []).map((x) => (typeof x === 'string' ? x : x.periode_ipl_tersedia ?? x));
  if (r.error.code !== 'PGRST202' && r.error.code !== '42883') throw r.error;
  const rows = unwrap(await supabase.from('tagihan_ipl').select('periode').order('periode', { ascending: false }).limit(5000));
  return [...new Set(rows.map((x) => x.periode))];
}

/** Pembayaran menunggu verifikasi. Mengembalikan { rows, total }; `batas` = berapa baris dimuat. */
export async function pembayaranMenunggu({ batas = 50 } = {}) {
  const r = await supabase.from('pembayaran_ipl').select('*, rumah:rumah_id(kode), warga:warga_id(nama)', { count: 'exact' })
    .eq('status', 'menunggu').order('created_at').order('id').range(0, batas - 1);
  if (r.error) throw r.error;
  const rows = r.data;
  const t = await perPotong(rows.map((x) => x.id), async (ids) =>
    unwrap(await supabase.from('tagihan_ipl').select('id,periode,nominal,pembayaran_id').in('pembayaran_id', ids)));
  return { rows: rows.map((x) => ({ ...x, tagihan: t.filter((y) => y.pembayaran_id === x.id) })), total: r.count ?? rows.length };
}

export const verifikasiPembayaran = async (id, terima, alasan) =>
  unwrap(await supabase.rpc('verifikasi_pembayaran', { p_id: id, p_terima: terima, p_alasan: alasan || null }));
export const tandaiLunasTunai = async (id) => unwrap(await supabase.rpc('tandai_lunas_tunai', { p_tagihan: id }));
export const hapusTagihan = async (id) => unwrap(await supabase.from('tagihan_ipl').delete().eq('id', id).eq('status', 'belum_bayar'));
