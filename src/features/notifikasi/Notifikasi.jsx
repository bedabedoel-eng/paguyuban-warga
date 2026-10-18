import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, EmptyState, ErrorState, Loader, SegTabs } from '../../components/ui';
import { useNotif } from '../../context/NotifContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarNotifikasi, tandaiDibaca } from '../../services/notifikasi';
import { NotifRow } from '../beranda/widgets';

export default function Notifikasi() {
  const [tab, setTab] = useState('semua');
  const { refresh } = useNotif();
  const toast = useToast();
  const s = useAsync(() => daftarNotifikasi({ belum: tab === 'belum' }), [tab]);
  async function baca(n) { if (!n.dibaca_at) { try { await tandaiDibaca([n.id]); refresh(); s.reload(); } catch { /* abaikan */ } } }
  async function semua() { try { await tandaiDibaca(); toast.success('Semua notifikasi ditandai dibaca'); refresh(); s.reload(); } catch (e) { toast.error(e); } }
  return (
    <>
      <PageHeader title="Notifikasi" actions={<Button size="sm" variant="outline" icon={CheckCheck} onClick={semua}>Tandai semua dibaca</Button>} mobileActions={<button className="icon-btn" onClick={semua} aria-label="Tandai semua dibaca"><CheckCheck size={21} /></button>} />
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'semua', label: 'Semua' }, { value: 'belum', label: 'Belum Dibaca' }]} />
          <Card pad>
            {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <EmptyState icon={Bell} title="Tidak ada notifikasi" /> : (
              <div className="list">{s.data.map((n) => <NotifRow key={n.id} n={n} big onClick={() => baca(n)} />)}</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
