import { AUTH_EMAIL_DOMAIN } from './supabase';

export { normalizeHp, formatHp } from './nomorHp.js';

/** Alamat email internal yang dipakai Supabase Auth untuk login nomor HP. */
export function hpToEmail(hp) {
  return `${hp}@${AUTH_EMAIL_DOMAIN}`;
}

export function waLink(hp, text = '') {
  return `https://wa.me/${hp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
