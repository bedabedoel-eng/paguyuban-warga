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

/* ---------- Ajakan memasang aplikasi ke layar utama ---------- */
export const EVENT_PASANG = 'pw:pasang';
let tawaran = null; // event beforeinstallprompt (Android/Chrome/Edge)
const KUNCI_TUNDA = 'pw:pasang-tunda';
const TUNDA_MS = 3 * 24 * 60 * 60 * 1000; // ditawarkan lagi setelah 3 hari bila ditutup

/** Sudah berjalan sebagai aplikasi terpasang? */
export const sudahTerpasang = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const bisaPasangLangsung = () => !!tawaran;
export const perangkatIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const perangkatSeluler = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || perangkatIos();

export function ditundaPasang() {
  try { const t = Number(localStorage.getItem(KUNCI_TUNDA)); return !!t && Date.now() - t < TUNDA_MS; } catch { return false; }
}
export function tundaPasang() {
  try { localStorage.setItem(KUNCI_TUNDA, String(Date.now())); } catch { /* abaikan */ }
}
/** Perlu menampilkan ajakan pasang? Hanya di HP/tablet, belum terpasang, dan belum ditutup baru-baru ini. */
export const perluAjakPasang = () => perangkatSeluler() && !sudahTerpasang() && !ditundaPasang();

/** Munculkan dialog pasang bawaan browser. Mengembalikan true bila pengguna menyetujui. */
export async function pasangAplikasi() {
  if (!tawaran) return false;
  const t = tawaran; tawaran = null;
  t.prompt();
  const { outcome } = await t.userChoice.catch(() => ({ outcome: 'dismissed' }));
  window.dispatchEvent(new Event(EVENT_PASANG));
  return outcome === 'accepted';
}

/** Tangkap event pasang sedini mungkin (dipanggil dari main.jsx, juga saat pengembangan). */
export function pantauPasang() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    tawaran = e;
    window.dispatchEvent(new Event(EVENT_PASANG));
  });
  window.addEventListener('appinstalled', () => { tawaran = null; window.dispatchEvent(new Event(EVENT_PASANG)); });
}
