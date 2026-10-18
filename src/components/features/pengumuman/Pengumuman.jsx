import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Loader, PillTabs } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengumuman } from '../../services/pengumuman';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';
import { tanggal } from '../../lib/format';
import { Thumb } from '../beranda/widgets';

export default function Pengumuman() {
  const { hak } = useAuth();
  const [kat, setKat] = useState('');
  const s = useAsync(() => daftarPengumuman({ kategori: kat }), [kat]);
  const tambah = hak.pengurus ? <Button size="sm" icon={Plus} to="/pengumuman/baru">Buat Pengumuman</Button> : null;
  return (
    <>
      <PageHeader title="Pengumuman" actions={tambah} mobileActions={null} />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          <PillTabs value={kat} onChange={setKat} tabs={[{ value: '', label: 'Semua' }, { value: 'penting', label: 'Penting' }, { value: 'kegiatan', label: 'Kegiatan' }, { value: 'info', label: 'Info' }]} />
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
            <Card><EmptyState icon={Megaphone} title="Belum ada pengumuman" /></Card>
          ) : (
            <Card pad>
              <div className="list">
                {s.data.map((p) => {
                  const k = KATEGORI_PENGUMUMAN[p.kategori];
                  return (
                    <Link key={p.id} to={`/pengumuman/${p.id}`} className="list-item">
                      <Thumb path={p.gambar_path} size={56} />
                      <span className="grow">
                        <span className="title clamp-2" style={{ display: '-webkit-box' }}>{p.disematkan ? '📌 ' : ''}{p.judul}</span>
                        <span className="sub">{tanggal(p.created_at)}</span>
                      </span>
                      <Badge tone={k?.tone}>{k?.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
      {hak.pengurus && <Link to="/pengumuman/baru" className="fab" aria-label="Buat pengumuman"><Plus size={26} /></Link>}
    </>
  );
}
