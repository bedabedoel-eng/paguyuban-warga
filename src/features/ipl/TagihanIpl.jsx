import { Receipt, House, History } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardHead, CardBody, Badge, ErrorState, EmptyState, Callout, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { tagihanRumah } from '../../services/ipl';
import { rupiah, periode, tanggal } from '../../lib/format';
import { STATUS_TAGIHAN } from '../../lib/constants';

export function RiwayatList({ items, limit }) {
  const rows = limit ? items.slice(0, limit) : items;
  if (!rows.length) return <EmptyState compact icon={History} title="Belum ada riwayat" />;
  return (
    <div className="rows">
      {rows.map((t) => {
        const st = STATUS_TAGIHAN[t.status];
        return (
          <div className="rowi" key={t.id}>
            <span className={`ico sm ${st.tone}`}><Receipt size={16} /></span>
            <span className="rowi-main">
              <span className="rowi-title">{periode(t.periode)}</span>
              <span className="rowi-sub">{t.status === 'lunas' && t.dibayar_at ? `Dibayar ${tanggal(t.dibayar_at, { pendek: true })}${t.metode === 'tunai' ? ' · tunai' : ''}` : `Jatuh tempo ${tanggal(t.jatuh_tempo, { pendek: true })}`}</span>
            </span>
            <span className="rowi-end" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className="money">{rupiah(t.nominal)}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TagihanIpl() {
  const { warga } = useAuth();
  const { pengaturan } = useSettings();
  const s = useAsync(() => tagihanRumah(warga.rumah_id), [warga.rumah_id]);
  const data = s.data || [];
  const belum = data.filter((t) => t.status === 'belum_bayar');
  const menunggu = data.filter((t) => t.status === 'menunggu_verifikasi');
  const total = belum.reduce((a, t) => a + t.nominal, 0);

  return (
    <div className="page narrow">
      <PageHeader title="Tagihan IPL" desc={`Iuran pengelolaan lingkungan rumah Blok ${warga.blok} No. ${warga.no_rumah}.`}
        actions={<Button size="sm" variant="secondary" icon={History} to="/ipl/riwayat">Riwayat</Button>} />
      {s.loading && !s.data ? <Card pad><SkeletonRows n={3} avatar={false} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !warga.rumah_id ? (
        <Card><EmptyState icon={House} title="Akun belum terhubung ke rumah" text="Hubungi sekretaris atau humas gang untuk menghubungkan akun Anda dengan data rumah." /></Card>
      ) : (
        <>
          <Card pad className="bill">
            <div className="row between wrap">
              <div>
                <div className="text-sm muted">{belum.length ? (belum.length > 1 ? `${belum.length} bulan belum dibayar` : `Tagihan ${periode(belum[0].periode)}`) : 'Total yang harus dibayar'}</div>
                <div className="amount">{rupiah(total)}</div>
              </div>
              <Badge tone={belum.length ? 'bad' : menunggu.length ? 'warn' : 'ok'} dot>{belum.length ? 'Belum lunas' : menunggu.length ? 'Sedang diperiksa' : 'Lunas'}</Badge>
            </div>
            <div className="meta">
              <span>Tarif {rupiah(data[0]?.nominal ?? pengaturan.tarif_ipl)} / bulan</span>
              <span>Jatuh tempo tiap tanggal {pengaturan.jatuh_tempo_hari}</span>
            </div>
            {belum.length > 0 && <Button size="lg" icon={Receipt} to="/ipl/bayar">Bayar {belum.length > 1 ? `${belum.length} tagihan` : 'sekarang'}</Button>}
            {belum.length === 0 && menunggu.length === 0 && data.length > 0 && <Callout tone="ok">Semua tagihan sudah lunas. Terima kasih atas partisipasinya.</Callout>}
            {menunggu.length > 0 && <Callout tone="warn">{menunggu.length} pembayaran sedang diperiksa bendahara. Anda akan menerima notifikasi setelah diverifikasi.</Callout>}
            {!data.length && <Callout tone="neutral">Belum ada tagihan. Tagihan muncul setelah bendahara menerbitkannya setiap bulan.</Callout>}
          </Card>
          <Card>
            <CardHead title="Tagihan terbaru" to="/ipl/riwayat" />
            <CardBody><RiwayatList items={data} limit={6} /></CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
