import { Phone } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, EmptyState, ErrorState, SkeletonRows, Button } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { daftarKontakDarurat } from '../../services/pengaturan';

export default function KontakDarurat() {
  const s = useAsync(daftarKontakDarurat, []);
  return (
    <div className="page narrow">
      <PageHeader back title="Kontak darurat" desc="Ketuk tombol untuk langsung menelepon." />
      <Card>
        {s.loading && !s.data ? <div className="card-body"><SkeletonRows n={4} /></div> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <EmptyState icon={Phone} title="Belum ada kontak darurat" text="Admin dapat menambahkannya di Pengaturan paguyuban." /> : (
          <div className="rows inset">{s.data.map((k) => (
            <div className="rowi" key={k.id}>
              <span className="ico round bad"><Phone size={18} /></span>
              <span className="rowi-main"><span className="rowi-title">{k.nama}</span><span className="rowi-sub">{k.keterangan}</span></span>
              <Button size="sm" variant="secondary" icon={Phone} href={`tel:${k.nomor.replace(/[^\d+]/g, '')}`}><span className="num">{k.nomor}</span></Button>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  );
}
