import { AUTH_EMAIL_DOMAIN } from './supabase';

/** Ubah 0812-3456-7890 / 812... / +62812... menjadi 628123456789. Null bila tidak valid. */
export function normalizeHp(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

/** Alamat email internal yang dipakai Supabase Auth untuk login nomor HP. */
export function hpToEmail(hp) {
  return `${hp}@${AUTH_EMAIL_DOMAIN}`;
}

/** 6281234567890 -> +62 812-3456-7890 */
export function formatHp(hp) {
  if (!hp) return '';
  const d = String(hp).replace(/\D/g, '');
  const local = d.startsWith('62') ? d.slice(2) : d;
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return '+62 ' + parts.join('-');
}

export function waLink(hp, text = '') {
  return `https://wa.me/${hp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
