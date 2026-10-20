import { useEffect, useState } from 'react';
import { Download, Share, X, MoreVertical } from 'lucide-react';
import { EVENT_PASANG, bisaPasangLangsung, pasangAplikasi, perangkatIos, perluAjakPasang, tundaPasang } from '../../lib/pwa';

/**
 * Ajakan memasang aplikasi ke layar utama HP. Tampil di semua halaman (termasuk sebelum login)
 * selama aplikasi belum terpasang. Android/Chrome: tombol Pasang membuka dialog pasang bawaan.
 * iPhone/iPad dan browser tanpa dialog pasang: petunjuk langkah singkat.
 * Ditutup = tidak muncul lagi selama 3 hari.
 */
export default function AjakPasang() {
  const [, paksa] = useState(0);
  const [tampil, setTampil] = useState(false);
  const [bantuan, setBantuan] = useState(false);
  useEffect(() => {
    const h = () => { paksa((n) => n + 1); setTampil(perluAjakPasang()); };
    window.addEventListener(EVENT_PASANG, h);
    const t = setTimeout(h, 2500); // beri jeda agar tidak langsung menutupi layar masuk
    return () => { window.removeEventListener(EVENT_PASANG, h); clearTimeout(t); };
  }, []);
  if (!tampil) return null;
  const tutup = () => { tundaPasang(); setTampil(false); };
  const langsung = bisaPasangLangsung();
  const ios = perangkatIos();
  async function pasang() {
    if (langsung) { const ok = await pasangAplikasi(); if (ok) setTampil(false); else if (!bisaPasangLangsung()) tutup(); }
    else setBantuan((b) => !b);
  }
  return (
    <div className="ajak-pasang" role="dialog" aria-label="Pasang aplikasi">
      <div className="ajak-pasang-row">
        <img src="/icon-192.png" alt="" width="40" height="40" />
        <div className="ajak-pasang-teks">
          <b>Pasang aplikasi di HP Anda</b>
          <span>Buka langsung dari layar utama, lebih cepat, tanpa mengetik alamat.</span>
        </div>
        <button type="button" className="ajak-pasang-x" onClick={tutup} aria-label="Tutup"><X size={18} /></button>
      </div>
      <div className="ajak-pasang-aksi">
        <button type="button" className="ajak-pasang-btn" onClick={pasang}><Download size={16} />{langsung ? 'Pasang sekarang' : 'Cara memasang'}</button>
        <button type="button" className="ajak-pasang-nanti" onClick={tutup}>Nanti saja</button>
      </div>
      {bantuan && !langsung && (
        <ol className="ajak-pasang-langkah">
          {ios ? (
            <>
              <li>Buka halaman ini di <b>Safari</b>.</li>
              <li>Ketuk tombol <b>Bagikan</b> <Share size={14} aria-hidden="true" /> di bagian bawah.</li>
              <li>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li>
            </>
          ) : (
            <>
              <li>Ketuk menu <MoreVertical size={14} aria-hidden="true" /> di pojok kanan atas browser.</li>
              <li>Pilih <b>Pasang aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li>
              <li>Ketuk <b>Pasang</b>.</li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}
