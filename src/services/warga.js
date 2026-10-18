import { supabase } from '../lib/supabase';
import { unwrap } from './_util';
// Domain email internal untuk login nomor HP (harus sama dengan yang dipakai saat pendaftaran)
const AUTH_EMAIL_DOMAIN = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'akun.paguyuban.local').trim().toLowerCase();

export const KOLOM_WARGA = 'id,nama,blok,no_rumah,gang_id,rumah_id,kepala_keluarga,pekerjaan,hobi,tentang,keluarga,foto_path,role,status,alasan_status,bergabung_at,created_at,pref_notifikasi,wajib_ganti_pin';

export async function profilSaya(uid) {
  const [w, k, j] = await Promise.all([
    supabase.from('warga').select(KOLOM_WARGA).eq('id', uid).maybeSingle(),
    supabase.from('warga_kontak').select('*').eq('warga_id', uid).maybeSingle(),
    supabase.from('pengurus').select('*').eq('warga_id', uid).eq('aktif', true).order('urutan'),
  ]);
  return { warga: unwrap(w), kontak: unwrap(k), jabatan: j.data || [] };
}

export async function hakSaya() {
  return unwrap(await supabase.rpc('hak_saya'));
}

export async function daftarWarga({ q = '', blok = '', gang = '', noRumah = '', pekerjaan = '', limit = 1000, urut = 'nama' } = {}) {
  let query = supabase.from('warga').select('id,nama,blok,no_rumah,gang_id,pekerjaan,foto_path,role,kepala_keluarga,bergabung_at').eq('status', 'aktif');
  if (urut === 'baru') query = query.order('bergabung_at', { ascending: false, nullsFirst: false });
  query = query.order('nama').limit(limit);
  if (q) query = query.ilike('nama', `%${q.replace(/[%_,()]/g, ' ')}%`);
  if (blok) query = query.eq('blok', blok);
  if (gang) query = query.eq('gang_id', gang);
  if (noRumah) query = query.eq('no_rumah', noRumah);
  if (pekerjaan) query = query.eq('pekerjaan', pekerjaan);
  return unwrap(await query);
}

export async function filterDirektori() {
  const rows = unwrap(await supabase.from('warga').select('blok,no_rumah,pekerjaan').eq('status', 'aktif').limit(2000));
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  return { nomor: uniq(rows.map((r) => r.no_rumah)), pekerjaan: uniq(rows.map((r) => r.pekerjaan)), rows };
}

export async function detailWarga(id) {
  return unwrap(await supabase.from('warga').select(KOLOM_WARGA).eq('id', id).single());
}

export async function kontakWarga(id) {
  const rows = unwrap(await supabase.rpc('kontak_warga', { p_id: id }));
  return rows?.[0] || null;
}

export async function ubahProfil(uid, data) {
  return unwrap(await supabase.from('warga').update(data).eq('id', uid).select(KOLOM_WARGA).single());
}

export async function ubahKontak(uid, data) {
  return unwrap(await supabase.from('warga_kontak').update(data).eq('warga_id', uid).select('*').single());
}

/* ----- Admin / pengurus ----- */
export async function wargaMenunggu() {
  // RLS hanya mengembalikan pendaftar di wilayah kewenangan pengguna
  const w = unwrap(await supabase.from('warga').select(KOLOM_WARGA).in('status', ['menunggu']).order('created_at'));
  const k = w.length ? unwrap(await supabase.from('warga_kontak').select('*').in('warga_id', w.map((x) => x.id))) : [];
  const km = Object.fromEntries(k.map((x) => [x.warga_id, x]));
  return w.map((x) => ({ ...x, kontak: km[x.id] || null }));
}

export async function semuaWarga({ status = '', q = '', blok = '', gang = '' } = {}) {
  let query = supabase.from('warga').select(KOLOM_WARGA).order('nama').limit(1000);
  if (status) query = query.eq('status', status);
  if (blok) query = query.eq('blok', blok);
  if (gang) query = query.eq('gang_id', gang);
  if (q) query = query.ilike('nama', `%${q.replace(/[%_,()]/g, ' ')}%`);
  const w = unwrap(await query);
  const k = w.length ? unwrap(await supabase.from('warga_kontak').select('*').in('warga_id', w.map((x) => x.id))) : [];
  const km = Object.fromEntries(k.map((x) => [x.warga_id, x]));
  return w.map((x) => ({ ...x, kontak: km[x.id] || null }));
}

export const setujuiAnggota = async (id, kk = true) => unwrap(await supabase.rpc('setujui_anggota', { p_id: id, p_kepala_keluarga: kk }));
export const tolakAnggota = async (id, alasan) => unwrap(await supabase.rpc('tolak_anggota', { p_id: id, p_alasan: alasan }));
export const ubahWargaAdmin = async (id, data) => unwrap(await supabase.from('warga').update(data).eq('id', id).select(KOLOM_WARGA).single());
export const ubahKontakAdmin = async (id, data) => unwrap(await supabase.from('warga_kontak').update(data).eq('warga_id', id));
export const resetSandiWarga = async (id, baru) => unwrap(await supabase.rpc('reset_sandi_warga', { p_id: id, p_baru: baru }));
/** Import massal (admin). rows: [{nama,hp,blok,no_rumah,gang?,pekerjaan?,kepala_keluarga?}] */
export const importWarga = async (rows, pin = '123456') =>
  unwrap(await supabase.rpc('import_warga', { p_rows: rows, p_domain: AUTH_EMAIL_DOMAIN, p_pin: pin }));
export const hapusWarga = async (id) => unwrap(await supabase.rpc('hapus_warga', { p_id: id }));

/** Jumlah warga aktif per blok & gang (untuk halaman Blok & gang). */
export async function sebaranWarga() {
  const rows = unwrap(await supabase.from('warga').select('blok,gang_id').eq('status', 'aktif').limit(5000));
  const gang = {}; const tanpaGang = {}; const blok = {};
  for (const r of rows) {
    if (r.blok) blok[r.blok] = (blok[r.blok] || 0) + 1;
    if (r.gang_id) gang[r.gang_id] = (gang[r.gang_id] || 0) + 1;
    else if (r.blok) tanpaGang[r.blok] = (tanpaGang[r.blok] || 0) + 1;
  }
  return { gang, tanpaGang, blok };
}
