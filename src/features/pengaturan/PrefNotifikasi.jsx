import PageHeader from '../../components/layout/PageHeader';
import { Card, Toggle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahProfil } from '../../services/warga';

const JENIS = [
  ['ipl', 'Tagihan & pembayaran IPL', 'Tagihan terbit, bukti diterima atau ditolak'],
  ['pengumuman', 'Pengumuman', 'Pengumuman umum dan info khusus jalan Anda'],
  ['kegiatan', 'Kegiatan', 'Kegiatan baru yang dijadwalkan'],
  ['laporan', 'Aspirasi saya', 'Tanggapan pengurus atas aspirasi Anda'],
  ['administrasi', 'Notulen & dokumen', 'Dokumen yang dibagikan pengurus'],
];

export default function PrefNotifikasi() {
  const { warga, user, setWarga, hak } = useAuth();
  const toast = useToast();
  const pref = warga.pref_notifikasi || {};
  const daftar = hak.pengurus ? [...JENIS, ['keuangan', 'Keuangan', 'Pengajuan dan keputusan pengeluaran kas'], ['akun', 'Pendaftar baru', 'Pendaftar di wilayah kewenangan Anda']] : JENIS;
  async function ubah(k, v) {
    try { setWarga(await ubahProfil(user.id, { pref_notifikasi: { ...pref, [k]: v } })); } catch (e) { toast.error(e); }
  }
  return (
    <div className="page narrow">
      <PageHeader back="/pengaturan" title="Notifikasi" desc="Pilih pemberitahuan yang ingin Anda terima di aplikasi." />
      <Card>
        <div className="rows inset">
          {daftar.map(([k, l, s]) => (
            <div className="rowi" key={k}>
              <span className="rowi-main"><span className="rowi-title">{l}</span><span className="rowi-sub">{s}</span></span>
              <Toggle label={l} checked={pref[k] !== false} onChange={(v) => ubah(k, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
