import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardBody, EmptyState, ErrorState, SegTabs, SkeletonRows, IconButton } from '../../components/ui';
import { useNotif } from '../../context/NotifContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarNotifikasi, tandaiDibaca } from '../../services/notifikasi';
import { NotifRow } from '../beranda/widgets';

export default function Notifikasi() {
  const [tab, setTab] = useState('semua');
  const { refresh, unread } = useNotif();
  const toast = useToast();
  const s = useAsync(() => daftarNotifikasi({ belum: tab === 'belum', limit: 100 }), [tab]);
  async function baca(n) { if (!n.dibaca_at) { try { await tandaiDibaca([n.id]); refresh(); } catch { /* abaikan */ } } }
  async function semua() { try { await tandaiDibaca(); toast.success('Semua notifikasi ditandai dibaca'); refresh(); s.reload(); } catch (e) { toast.error(e); } }
  return (
    <div className="page narrow">
      <PageHeader title="Notifikasi"
        actions={unread > 0 && <Button size="sm" variant="secondary" icon={CheckCheck} onClick={semua}>Tandai semua dibaca</Button>}
        mobileActions={unread > 0 && <IconButton icon={CheckCheck} label="Tandai semua dibaca" onClick={semua} />} />
      <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'semua', label: 'Semua' }, { value: 'belum', label: 'Belum dibaca', count: unread }]} />
      <Card>
        <CardBody>
          {s.loading && !s.data ? <SkeletonRows n={5} /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
            <EmptyState icon={Bell} title={tab === 'belum' ? 'Semua notifikasi sudah dibaca' : 'Belum ada notifikasi'} text="Tagihan, pengumuman, dan tanggapan aspirasi akan diberitahukan di sini." />
          ) : <div className="rows">{s.data.map((n) => <NotifRow key={n.id} n={n} onClick={() => baca(n)} />)}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
