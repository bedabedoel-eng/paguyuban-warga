import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { Callout } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { statusTagihanOtomatis } from '../../services/pengaturan';
import { tanggal } from '../../lib/format';

/**
 * Penanda untuk admin: tagihan IPL otomatis tidak akan terbit bila pg_cron tidak aktif.
 * mode "dashboard": hanya tampil bila saklar menyala tetapi jadwal tidak bisa berjalan (peringatan).
 * mode "pengaturan": selalu menampilkan keadaan jadwal di dekat saklar.
 * Bila SQL 16 belum dijalankan atau pemeriksaan gagal, penanda tidak tampil (tidak mengganggu halaman).
 */
export default function PenandaTagihanOtomatis({ mode = 'dashboard' }) {
  const { hak } = useAuth();
  const st = useAsync(statusTagihanOtomatis, [], { enabled: !!hak.admin });
  const d = st.data;
  if (!hak.admin || !d) return null;

  if (mode === 'dashboard') {
    if (!d.perlu_tindakan) return null;
    return (
      <Callout tone="bad" icon={CalendarClock}>
        <b>Tagihan IPL otomatis tidak akan terbit.</b> Saklar “Terbitkan tagihan IPL otomatis” menyala, tetapi {d.masalah}{' '}
        <Link className="link" to="/admin/pengaturan">Buka Pengaturan</Link>
      </Callout>
    );
  }

  if (d.siap) {
    return (
      <p className="span-2 text-sm muted">
        Jadwal pg_cron aktif{d.terakhir_jalan ? `; jalan terakhir ${tanggal(d.terakhir_jalan, { pendek: true })} (${d.terakhir_status === 'succeeded' ? 'berhasil' : d.terakhir_status})` : '; belum pernah dijalankan'}.
      </p>
    );
  }
  return (
    <div className="span-2">
      <Callout tone={d.saklar ? 'bad' : 'warn'}>
        {d.saklar ? <b>Saklar menyala, tetapi tagihan tidak akan terbit. </b> : <b>Saklar belum akan berfungsi. </b>}
        {d.masalah}
      </Callout>
    </div>
  );
}
