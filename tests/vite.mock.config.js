// Konfigurasi Vite khusus pengujian tampilan dengan data contoh (tanpa Supabase).
// Jalankan: npx vite --config tests/vite.mock.config.js  lalu buka /?as=ketua
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@supabase/supabase-js': fileURLToPath(new URL('./mock/supabase-js.js', import.meta.url)) } },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://mock.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('mock-key'),
    'import.meta.env.VITE_AUTH_EMAIL_DOMAIN': JSON.stringify('akun.contoh.id'),
  },
  server: { port: 5174, host: '127.0.0.1' },
});
