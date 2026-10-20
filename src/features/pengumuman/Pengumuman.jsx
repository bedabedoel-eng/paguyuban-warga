import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button } from '../../components/ui';
import DaftarKartu from '../../components/data/DaftarKartu';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengumuman } from '../../services/pengumuman';
import { PengumumanRow } from '../beranda/widgets';
import { EmptyState } from '../../components/ui';

const CARI = { placeholder: 'Cari judul atau isi pengumuman', ambil: (p) => `${p.judul} ${p.isi || ''}` };
const FILTER = [{
  key: 'kategori', label: 'Kategori', chips: true, semuaLabel: 'Semua', tanpaHitung: true,
  options: [{ value: 'penting', label: 'Penting' }, { value: 'kegiatan', label: 'Kegiatan' }, { value: 'info', label: 'Info' }, { value: 'umum', label: 'Umum' }],
  test: (p, v) => p.kategori === v,
}];
// Tanpa `sort` = urutan dari server (disematkan dulu, lalu terbaru).
const URUTAN = [
  { key: 'baru', label: 'Terbaru (disematkan dulu)' },
  { key: 'lama', label: 'Terlama', sort: (p) => p.created_at, dir: 'asc' },
  { key: 'judul', label: 'Judul A–Z', sort: (p) => p.judul, dir: 'asc' },
];
const ambil = () => daftarPengumuman({ limit: 500 });

export default function Pengumuman() {
  const { hak } = useAuth();
  const s = useAsync(ambil, []);
  const tombol = hak.kelola_info && <Button size="sm" icon={Plus} to="/pengumuman/baru">Buat pengumuman</Button>;
  return (
    <div className="page narrow">
      <PageHeader title="Pengumuman" desc="Kabar resmi dari pengurus, termasuk info khusus jalan Anda." actions={tombol} />
      <DaftarKartu rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload} satuan="pengumuman" bungkus="daftar"
        cari={CARI} filters={FILTER} urutan={URUTAN} defaultUrutan="baru"
        renderItem={(p) => <PengumumanRow key={p.id} p={p} />}
        kosong={<EmptyState icon={Megaphone} title="Belum ada pengumuman" text={hak.kelola_info ? 'Pengumuman yang Anda buat langsung dikirim sebagai notifikasi ke warga.' : 'Pengumuman dari pengurus akan tampil di sini.'} action={tombol} />} />
      {hak.kelola_info && <Link to="/pengumuman/baru" className="fab"><Plus size={20} />Buat</Link>}
    </div>
  );
}
