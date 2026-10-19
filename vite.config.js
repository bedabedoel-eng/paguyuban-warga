import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': versi baru tidak langsung menggantikan yang sedang dipakai; warga diberi tombol "Perbarui".
      registerType: 'prompt',
      injectRegister: false, // didaftarkan manual di src/lib/pwa.js
      manifest: false, // memakai public/manifest.webmanifest
      workbox: {
        // Hanya cangkang aplikasi (JS, CSS, HTML, ikon) dan font Latin yang disimpan.
        // Panggilan Supabase (data, auth, storage) TIDAK pernah disimpan: selalu lewat jaringan.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'assets/*-latin-wght-normal-*.woff2', 'assets/*-latin-ext-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'pw-font', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, host: true },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
