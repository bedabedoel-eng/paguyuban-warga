import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, CardBody, ErrorState, Chips, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { tagihanRumah } from '../../services/ipl';
import { RiwayatList } from './TagihanIpl';

export default function RiwayatIpl() {
  const { warga } = useAuth();
  const [f, setF] = useState('');
  const s = useAsync(() => tagihanRumah(warga.rumah_id), [warga.rumah_id]);
  const data = s.data || [];
  const n = (k) => data.filter((t) => t.status === k).length;
  const items = data.filter((t) => !f || t.status === f);
  return (
    <div className="page narrow">
      <PageHeader back="/ipl" title="Riwayat pembayaran" />
      <Chips value={f} onChange={setF} tabs={[{ value: '', label: 'Semua', n: data.length }, { value: 'lunas', label: 'Lunas', n: n('lunas') }, { value: 'belum_bayar', label: 'Belum bayar', n: n('belum_bayar') }, { value: 'menunggu_verifikasi', label: 'Diperiksa', n: n('menunggu_verifikasi') }]} />
      <Card><CardBody>{s.loading && !s.data ? <SkeletonRows n={5} /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : <RiwayatList items={items} />}</CardBody></Card>
    </div>
  );
}
