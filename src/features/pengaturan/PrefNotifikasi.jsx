import PageHeader from '../../components/layout/PageHeader';
import { Card, Toggle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahProfil } from '../../services/warga';

const JENIS = [
  ['ipl', 'Tagihan & pembayaran IPL'], ['pengumuman', 'Pengumuman baru'], ['kegiatan', 'Kegiatan baru'], ['laporan', 'Status laporan saya'],
];

export default function PrefNotifikasi() {
  const { warga, user, setWarga } = useAuth();
  const toast = useToast();
  const pref = warga.pref_notifikasi || {};
  async function ubah(k, v) {
    try { setWarga(await ubahProfil(user.id, { pref_notifikasi: { ...pref, [k]: v } })); } catch (e) { toast.error(e); }
  }
  return (
    <>
      <PageHeader title="Notifikasi" />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad>
          <p className="small text-2 mb-3">Pilih jenis pemberitahuan yang ingin Anda terima di aplikasi.</p>
          <div className="list">{JENIS.map(([k, l]) => (
            <div className="list-item" key={k}><span className="grow title">{l}</span><Toggle label={l} checked={pref[k] !== false} onChange={(v) => ubah(k, v)} /></div>
          ))}</div>
        </Card>
      </div>
    </>
  );
}
