import { Phone } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState, Loader } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { daftarKontakDarurat } from '../../services/pengaturan';

export default function KontakDarurat() {
  const s = useAsync(daftarKontakDarurat, []);
  return (
    <>
      <PageHeader title="Kontak Darurat" />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad>
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <EmptyState icon={Phone} title="Belum ada kontak" /> : (
            <div className="list">{s.data.map((k) => (
              <a key={k.id} className="list-item" href={`tel:${k.nomor.replace(/[^\d+]/g, '')}`}>
                <span className="icon-circle tone-red" style={{ width: 40, height: 40 }}><Phone size={18} /></span>
                <span className="grow"><span className="title" style={{ display: 'block' }}>{k.nama}</span><span className="sub">{k.keterangan}</span></span>
                <b>{k.nomor}</b>
              </a>
            ))}</div>
          )}
        </Card>
      </div>
    </>
  );
}
