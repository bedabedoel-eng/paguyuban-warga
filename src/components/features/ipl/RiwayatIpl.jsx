import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, Loader, ErrorState, PillTabs } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { tagihanRumah } from '../../services/ipl';
import { RiwayatList } from './TagihanIpl';

export default function RiwayatIpl() {
  const { warga } = useAuth();
  const [f, setF] = useState('semua');
  const s = useAsync(() => tagihanRumah(warga.rumah_id), [warga.rumah_id]);
  const items = (s.data || []).filter((t) => f === 'semua' || t.status === f);
  return (
    <>
      <PageHeader title="Riwayat Pembayaran" />
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-inner">
          <PillTabs value={f} onChange={setF} tabs={[{ value: 'semua', label: 'Semua' }, { value: 'lunas', label: 'Lunas' }, { value: 'belum_bayar', label: 'Belum Bayar' }, { value: 'menunggu_verifikasi', label: 'Diverifikasi' }]} />
          <Card pad>{s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : <RiwayatList items={items} />}</Card>
        </div>
      </div>
    </>
  );
}
