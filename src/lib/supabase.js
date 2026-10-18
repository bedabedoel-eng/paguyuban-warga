import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true bila variabel lingkungan Supabase sudah diisi. */
export const isConfigured = Boolean(url && key && !url.includes('xxxx'));

// Hanya anon/publishable key yang boleh ada di frontend. Hak akses dijaga RLS di database.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export const AUTH_EMAIL_DOMAIN = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'akun.paguyuban.local').trim().toLowerCase();
export const GOOGLE_LOGIN = String(import.meta.env.VITE_GOOGLE_LOGIN || '').toLowerCase() === 'true';
