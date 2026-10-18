import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardBody, EmptyState, ErrorState, Chips, SkeletonRows, SortSelect } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengumuman } from '../../services/pengumuman';
import { PengumumanRow } from '../beranda/widgets';
import { urutkan } from '../../lib/sort';

export default function Pengumuman() {
  const { hak } = useAuth();
  const [kat, setKat] = useState('');
  const [urut, setUrut] = useState('baru');
  const s = useAsync(() => daftarPengumuman({ kategori: kat, limit: 100 }), [kat]);
  const data = useMemo(() => {
    if (urut === 'lama') return urutkan(s.data, (p) => p.created_at, 'asc');
    if (urut === 'judul') return urutkan(s.data, (p) => p.judul, 'asc');
    return s.data; // bawaan: yang disematkan lebih dulu, lalu terbaru
  }, [s.data, urut]);
  return (
    <div className="page narrow">
      <PageHeader title="Pengumuman" desc="Kabar resmi dari pengurus, termasuk info khusus gang Anda."
        actions={hak.kelola_info && <Button size="sm" icon={Plus} to="/pengumuman/baru">Buat pengumuman</Button>} />
      <div className="toolbar">
        <Chips value={kat} onChange={setKat} tabs={[{ value: '', label: 'Semua' }, { value: 'penting', label: 'Penting' }, { value: 'kegiatan', label: 'Kegiatan' }, { value: 'info', label: 'Info' }, { value: 'umum', label: 'Umum' }]} />
        <span className="toolbar-end"><SortSelect value={urut} onChange={setUrut} options={[{ value: 'baru', label: 'Terbaru (disematkan dulu)' }, { value: 'lama', label: 'Terlama' }, { value: 'judul', label: 'Judul A–Z' }]} /></span>
      </div>
      <Card>
        <CardBody>
          {s.loading && !s.data ? <SkeletonRows n={5} /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !data?.length ? (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" text={hak.kelola_info ? 'Pengumuman yang Anda buat langsung dikirim sebagai notifikasi ke warga.' : 'Pengumuman dari pengurus akan tampil di sini.'}
              action={hak.kelola_info && <Button size="sm" icon={Plus} to="/pengumuman/baru">Buat pengumuman</Button>} />
          ) : <div className="rows">{data.map((p) => <PengumumanRow key={p.id} p={p} />)}</div>}
        </CardBody>
      </Card>
      {hak.kelola_info && <Link to="/pengumuman/baru" className="fab"><Plus size={20} />Buat</Link>}
    </div>
  );
}
