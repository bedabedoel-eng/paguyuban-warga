import { Component } from 'react';
import { CircleAlert, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

const CHUNK_RE = /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Unable to preload CSS/i;
const RELOAD_KEY = 'pw-chunk-reload';

/** Gagal memuat berkas halaman (biasanya karena versi baru sudah dirilis atau sinyal putus). */
export const galatMuatBerkas = (err) => CHUNK_RE.test(String(err?.message || err || ''));

/**
 * Muat ulang sekali otomatis saat berkas halaman hilang setelah rilis baru.
 * Penjaga sessionStorage mencegah perulangan tanpa akhir. Mengembalikan true bila memuat ulang.
 */
export function muatUlangSekali() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { return false; }
  window.location.reload();
  return true;
}

/** Hapus penjaga setelah aplikasi berhasil tampil, agar rilis berikutnya juga bisa dipulihkan. */
export function bersihkanPenjagaMuat() {
  try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* abaikan */ }
}

/**
 * Tangkap galat saat render agar layar tidak putih.
 * level="app": halaman penuh (di luar router). level="page": hanya area konten, menu tetap bisa dipakai.
 * resetKey: ubah nilainya (mis. pathname) untuk memulihkan otomatis saat pengguna pindah halaman.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
    if (galatMuatBerkas(error)) muatUlangSekali();
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const berkas = galatMuatBerkas(error);
    const penuh = this.props.level !== 'page';
    const kotak = (
      <div className="card" role="alert">
        <div className="empty">
          <span className="ico bad"><CircleAlert size={24} aria-hidden="true" /></span>
          <h3>{berkas ? 'Halaman gagal dimuat' : 'Terjadi kesalahan pada halaman ini'}</h3>
          <p>
            {berkas
              ? 'Koneksi terputus atau versi aplikasi baru saja diperbarui. Muat ulang untuk melanjutkan.'
              : 'Data Anda aman. Coba muat ulang halaman. Bila masih terjadi, hubungi pengurus.'}
          </p>
          {import.meta.env.DEV && <pre className="text-xs muted" style={{ whiteSpace: 'pre-wrap', textAlign: 'left', maxWidth: '100%', overflow: 'auto' }}>{String(error?.stack || error)}</pre>}
          <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
            <Button icon={RefreshCw} onClick={() => window.location.reload()}>Muat ulang</Button>
            {!berkas && <Button variant="secondary" onClick={() => this.setState({ error: null })}>Coba lagi</Button>}
            {penuh && <Button variant="ghost" icon={Home} href="/">Ke beranda</Button>}
          </div>
        </div>
      </div>
    );
    return penuh ? <div className="page narrow" style={{ paddingTop: 72 }}>{kotak}</div> : <div className="page narrow">{kotak}</div>;
  }
}
