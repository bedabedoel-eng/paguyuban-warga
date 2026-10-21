import { supabase } from '../lib/supabase';
import { normalizeHp, hpToEmail } from '../lib/phone';
import { unwrap } from './_util';
import { LoginDitunda, pesanSalahPin } from '../lib/loginBatas';

/**
 * Pembatasan percobaan di sisi aplikasi (SQL 14). Bila fungsi belum dipasang atau jaringan bermasalah,
 * login tetap berjalan: Supabase Auth adalah penentu akhir. Penegakan penuh butuh hook server (lihat SQL 14).
 */
async function batasLogin(nama, hp) {
  try {
    const { data, error } = await supabase.rpc(nama, { p_hp: hp });
    if (error || !data) return { tunggu: 0, sisa: 5 };
    return data;
  } catch { return { tunggu: 0, sisa: 5 }; }
}

export async function masukDenganHp(hpInput, password) {
  const hp = normalizeHp(hpInput);
  if (!hp) throw new Error('Nomor HP tidak valid');
  const awal = await batasLogin('cek_batas_login', hp);
  if (awal.tunggu > 0) throw new LoginDitunda(awal.tunggu);
  const { data, error } = await supabase.auth.signInWithPassword({ email: hpToEmail(hp), password });
  if (error) {
    if (/Invalid login credentials/i.test(String(error.message || ''))) {
      const st = await batasLogin('catat_login_gagal', hp);
      if (st.tunggu > 0) throw new LoginDitunda(st.tunggu);
      const e = new Error(pesanSalahPin(st.sisa));
      e.code = 'invalid_credentials';
      throw e;
    }
    throw error;
  }
  // Hapus penghitung gagal milik sendiri; tidak boleh menggagalkan login
  try { await supabase.rpc('catat_login_berhasil'); } catch { /* abaikan */ }
  return data;
}

/** Admin: buka kunci login seorang anggota (menghapus penghitung gagal). */
export async function bukaKunciLogin(wargaId) {
  return unwrap(await supabase.rpc('buka_kunci_login', { p_warga_id: wargaId }));
}

/** Admin: status penghitung gagal untuk satu nomor HP (62...), atau null bila bersih. */
export async function statusLoginHp(hp) {
  if (!hp) return null;
  return unwrap(await supabase.from('percobaan_login').select('*').eq('nomor_hp', hp).maybeSingle());
}

/** Admin: apakah hook penegakan sisi server pernah aktif. */
export async function statusPenegakanLogin() {
  return unwrap(await supabase.rpc('status_penegakan_login'));
}

export async function daftar({ nama, hp: hpInput, blok, noRumah, gang, password }) {
  const hp = normalizeHp(hpInput);
  if (!hp) throw new Error('Nomor HP tidak valid');
  const { data, error } = await supabase.auth.signUp({
    email: hpToEmail(hp),
    password,
    options: { data: { nama: nama.trim(), nomor_hp: hp, blok, no_rumah: noRumah.trim().toUpperCase(), gang_id: gang || null } },
  });
  if (error) throw error;
  // Bila "Confirm email" masih aktif di Supabase, session kosong & user tidak bisa masuk.
  if (!data.session) {
    const err = new Error('Email not confirmed');
    throw err;
  }
  return data;
}

export async function masukGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/', queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export const keluar = () => supabase.auth.signOut();

export async function lengkapiPendaftaran({ nama, hp, blok, noRumah, gang }) {
  return unwrap(await supabase.rpc('lengkapi_pendaftaran', { p_nama: nama, p_hp: hp, p_blok: blok, p_no_rumah: noRumah, p_gang: gang || null }));
}

export async function ubahSandi(lama, baru) {
  return unwrap(await supabase.rpc('ubah_sandi', { p_lama: lama, p_baru: baru }));
}

export async function keluarSemuaPerangkat() {
  return supabase.auth.signOut({ scope: 'global' });
}
