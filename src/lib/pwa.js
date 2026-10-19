/**
 * Pendaftaran service worker (PWA).
 * - Hanya aktif pada build produksi.
 * - Versi baru tidak otomatis menggantikan: pengguna diberi banner "Perbarui" (lihat StatusAplikasi).
 * - Service worker hanya menyimpan cangkang aplikasi; data Supabase tidak pernah disimpan di perangkat.
 */
export const EVENT_PEMBARUAN = 'pw:pembaruan';

let updateSW = null;
let menunggu = false;

/** Ada versi baru yang siap dipasang? (untuk komponen yang baru tampil setelah event terlanjur terkirim) */
export const adaPembaruan = () => menunggu;

/** Pasang versi baru dan muat ulang halaman. */
export function terapkanPembaruan() {
  if (updateSW) updateSW(true);
  else window.location.reload();
}

export function daftarkanPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          menunggu = true;
          window.dispatchEvent(new Event(EVENT_PEMBARUAN));
        },
        onRegisteredSW(_url, reg) {
          if (!reg) return;
          const cek = () => { if (navigator.onLine) reg.update().catch(() => {}); };
          window.setInterval(cek, 60 * 60 * 1000);
          document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cek(); });
        },
      });
    })
    .catch(() => { /* aplikasi tetap berjalan tanpa service worker */ });
}
