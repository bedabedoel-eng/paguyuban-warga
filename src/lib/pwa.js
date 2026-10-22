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
const KUNCI_TUNDA = 'pw:pasang-tunda';      // sessionStorage: ditutup = tidak muncul lagi selama sesi ini saja
const KUNCI_TERPASANG = 'pw:terpasang';     // localStorage: browser ini pernah memasang/menjalankan aplikasi terpasang

/** Sedang berjalan sebagai aplikasi terpasang (bukan tab browser)? */
export const sedangSebagaiAplikasi = () => {
  const mm = (q) => window.matchMedia?.(q).matches;
  return !!(mm('(display-mode: standalone)') || mm('(display-mode: minimal-ui)') || mm('(display-mode: fullscreen)') || window.navigator.standalone === true);
};

function ingatTerpasang(ya) {
  try { if (ya) localStorage.setItem(KUNCI_TERPASANG, '1'); else localStorage.removeItem(KUNCI_TERPASANG); } catch { /* abaikan */ }
}

/** Sudah terpasang? Dibuka dari ikon = pasti; dibuka dari tab browser = dari catatan pemasangan di browser ini. */
export const sudahTerpasang = () => {
  if (sedangSebagaiAplikasi()) { ingatTerpasang(true); return true; }
  try { return localStorage.getItem(KUNCI_TERPASANG) === '1'; } catch { return false; }
};

export const bisaPasangLangsung = () => !!tawaran;
export const perangkatIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const perangkatSeluler = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || perangkatIos();

/**
 * Browser di dalam aplikasi lain (Facebook, Instagram, TikTok, WebView Android, dsb.) tidak bisa memasang aplikasi.
 * Di iPhone, hanya Safari yang punya "Tambah ke Layar Utama" untuk semua versi; yang tanpa "Safari" di UA dianggap dalam aplikasi.
 */
export function browserDalamAplikasi() {
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|MicroMessenger|; wv\)/i.test(ua)) return true;
  return perangkatIos() && !/safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function ditundaPasang() {
  try { return sessionStorage.getItem(KUNCI_TUNDA) === '1'; } catch { return false; }
}
/** "Nanti saja" / tutup: sembunyikan selama sesi ini. Dibuka lagi (tab/aplikasi baru) ajakan muncul kembali sampai terpasang. */
export function tundaPasang() {
  try { sessionStorage.setItem(KUNCI_TUNDA, '1'); } catch { /* abaikan */ }
}
/** Perlu menampilkan ajakan pasang? Hanya di HP/tablet, belum terpasang, dan belum ditutup pada sesi ini. */
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
    ingatTerpasang(false); // browser menawarkan pasang = belum terpasang (mis. sudah dihapus dari layar utama)
    window.dispatchEvent(new Event(EVENT_PASANG));
  });
  window.addEventListener('appinstalled', () => { tawaran = null; ingatTerpasang(true); window.dispatchEvent(new Event(EVENT_PASANG)); });
}
