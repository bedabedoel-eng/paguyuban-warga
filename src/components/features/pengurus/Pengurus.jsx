import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, UsersRound } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Card, EmptyState, ErrorState, Loader, SegTabs } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengurus } from '../../services/pengurus';

export default function Pengurus() {
  const [tab, setTab] = useState('inti');
  const s = useAsync(daftarPengurus, []);
  const rows = (s.data || []).filter((p) => (tab === 'inti' ? p.inti : true));
  return (
    <>
      <PageHeader title="Pengurus" />
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'inti', label: 'Pengurus Inti' }, { value: 'semua', label: 'Semua' }]} />
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !rows.length ? <Card><EmptyState icon={UsersRound} title="Belum ada data pengurus" /></Card> : (
            <div className="stack sm">
              {rows.map((p) => (
                <Link key={p.id} to={`/warga/${p.warga_id}`} className="card card-pad row pengurus-row" style={{ gap: 14, color: 'inherit', textDecoration: 'none' }}>
                  <Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={52} />
                  <span className="grow">
                    <span className="jab" style={{ display: 'block' }}>{p.jabatan}</span>
                    <span className="nm" style={{ display: 'block' }}>{p.warga?.nama}</span>
                    <span className="tiny muted">{p.warga?.blok}-{p.warga?.no_rumah}{p.periode_mulai ? ` • ${p.periode_mulai} - ${p.periode_selesai || ''}` : ''}</span>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
