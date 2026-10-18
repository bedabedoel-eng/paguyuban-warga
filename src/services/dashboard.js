import { supabase } from '../lib/supabase';
import { unwrap } from './_util';

export const statistik = async () => unwrap(await supabase.rpc('statistik_dashboard'));
export const statistikIplBulanan = async (tahun) => unwrap(await supabase.rpc('statistik_ipl_bulanan', { p_tahun: tahun }));
export const arusKas = async (tahun) => unwrap(await supabase.rpc('arus_kas_bulanan', { p_tahun: tahun }));
export async function aktivitasTerbaru(limit = 6) {
  return unwrap(await supabase.from('aktivitas').select('*, pelaku:pelaku_id(nama)').order('created_at', { ascending: false }).limit(limit));
}

/** Cuaca gratis dari Open-Meteo (tanpa kunci API). */
export async function cuaca(lat, lon) {
  if (lat == null || lon == null) return null;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
  if (!r.ok) return null;
  const j = await r.json();
  return { suhu: Math.round(j.current?.temperature_2m), kode: j.current?.weather_code };
}

export function labelCuaca(kode) {
  if (kode == null) return '';
  if (kode === 0) return 'Cerah';
  if (kode <= 2) return 'Cerah Berawan';
  if (kode === 3) return 'Berawan';
  if (kode <= 48) return 'Berkabut';
  if (kode <= 67) return 'Hujan';
  if (kode <= 77) return 'Salju';
  if (kode <= 82) return 'Hujan Lebat';
  return 'Badai Petir';
}

/** Pencarian global (dibatasi RLS). */
export async function cariGlobal(q) {
  const s = `%${q.replace(/[%_,()]/g, ' ')}%`;
  const [w, p, k] = await Promise.all([
    supabase.from('warga').select('id,nama,blok,no_rumah,gang_id').eq('status', 'aktif').ilike('nama', s).limit(5),
    supabase.from('pengumuman').select('id,judul,created_at').ilike('judul', s).limit(5),
    supabase.from('kegiatan').select('id,judul,mulai').ilike('judul', s).limit(5),
  ]);
  return { warga: w.data || [], pengumuman: p.data || [], kegiatan: k.data || [] };
}
