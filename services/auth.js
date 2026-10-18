import { supabase } from '../lib/supabase';
import { normalizeHp, hpToEmail } from '../lib/phone';
import { unwrap } from './_util';

export async function masukDenganHp(hpInput, password) {
  const hp = normalizeHp(hpInput);
  if (!hp) throw new Error('Nomor HP tidak valid');
  const { data, error } = await supabase.auth.signInWithPassword({ email: hpToEmail(hp), password });
  if (error) throw error;
  return data;
}

export async function daftar({ nama, hp: hpInput, blok, noRumah, password }) {
  const hp = normalizeHp(hpInput);
  if (!hp) throw new Error('Nomor HP tidak valid');
  const { data, error } = await supabase.auth.signUp({
    email: hpToEmail(hp),
    password,
    options: { data: { nama: nama.trim(), nomor_hp: hp, blok, no_rumah: noRumah.trim().toUpperCase() } },
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

export async function lengkapiPendaftaran({ nama, hp, blok, noRumah }) {
  return unwrap(await supabase.rpc('lengkapi_pendaftaran', { p_nama: nama, p_hp: hp, p_blok: blok, p_no_rumah: noRumah }));
}

export async function ubahSandi(lama, baru) {
  return unwrap(await supabase.rpc('ubah_sandi', { p_lama: lama, p_baru: baru }));
}

export async function keluarSemuaPerangkat() {
  return supabase.auth.signOut({ scope: 'global' });
}
