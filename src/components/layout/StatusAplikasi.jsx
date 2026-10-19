import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useOnline';
import { EVENT_PEMBARUAN, adaPembaruan, terapkanPembaruan } from '../../lib/pwa';

/** Pita status di atas halaman: mode offline dan ajakan memperbarui aplikasi. */
export default function StatusAplikasi() {
  const online = useOnline();
  const [baru, setBaru] = useState(adaPembaruan());
  useEffect(() => {
    const h = () => setBaru(true);
    window.addEventListener(EVENT_PEMBARUAN, h);
    return () => window.removeEventListener(EVENT_PEMBARUAN, h);
  }, []);
  if (online && !baru) return null;
  return (
    <div className="status-app" role="status" aria-live="polite">
      {!online && (
        <div className="status-app-row off">
          <WifiOff size={16} aria-hidden="true" />
          <span>Anda sedang offline. Data terbaru belum bisa dimuat dan perubahan belum bisa disimpan.</span>
        </div>
      )}
      {baru && (
        <div className="status-app-row baru">
          <RefreshCw size={16} aria-hidden="true" />
          <span>Versi baru aplikasi tersedia.</span>
          <button type="button" onClick={terapkanPembaruan}>Perbarui</button>
        </div>
      )}
    </div>
  );
}
