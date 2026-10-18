import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, Badge, Loader, ErrorState, EmptyState, Alert } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { tagihanRumah } from '../../services/ipl';
import { rupiah, periode, tanggal } from '../../lib/format';
import { STATUS_TAGIHAN } from '../../lib/constants';

export function RiwayatList({ items, limit }) {
  const rows = limit ? items.filter((t) => t.status === 'lunas').slice(0, limit) : items;
  if (!rows.length) return <p className="small muted center" style={{ padding: 16 }}>Belum ada riwayat.</p>;
  return (
    <div className="list">
      {rows.map((t) => {
        const st = STATUS_TAGIHAN[t.status];
        return (
          <div className="list-item" key={t.id}>
            <span className="icon-square hist-icon" style={{ background: 'var(--green-50)' }}><Coins size={17} /></span>
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{periode(t.periode, true)}</span>
              <span className="sub">{t.status === 'lunas' && t.dibayar_at ? `Dibayar ${tanggal(t.dibayar_at, { pendek: true })}` : `Jatuh tempo ${tanggal(t.jatuh_tempo, { pendek: true })}`}</span>
            </span>
            <Badge tone={st.tone}>{st.label}</Badge>
            <span className="bold nowrap" style={{ minWidth: 76, textAlign: 'right', fontSize: 13 }}>{rupiah(t.nominal)}</span>
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
  const belum = (s.data || []).filter((t) => t.status === 'belum_bayar');
  const menunggu = (s.data || []).filter((t) => t.status === 'menunggu_verifikasi');
  const total = belum.reduce((a, t) => a + t.nominal, 0);
  const berjalan = belum[belum.length - 1] || (s.data || [])[0];

  return (
    <>
      <PageHeader title="Tagihan IPL" back={false} />
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="page-inner">
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !warga.rumah_id ? (
            <EmptyState icon={Coins} title="Belum terhubung ke rumah" text="Hubungi pengurus untuk menghubungkan akun Anda dengan rumah." />
          ) : (
            <>
              <Card className="ipl-summary">
                <div className="row between">
                  <div><div className="small muted">Periode</div><div className="bold" style={{ fontSize: 15 }}>{berjalan ? periode(berjalan.periode) : '-'}</div></div>
                  {berjalan && <Badge tone={STATUS_TAGIHAN[berjalan.status].tone}>{STATUS_TAGIHAN[berjalan.status].label}</Badge>}
                </div>
                <div className="grid2">
                  <div><div className="small muted">Tarif IPL</div><div className="big">{rupiah(berjalan?.nominal ?? pengaturan.tarif_ipl)}<span className="small muted"> / bulan</span></div></div>
                  <div><div className="small muted">{belum.length > 1 ? `Total ${belum.length} tagihan` : 'Total Tagihan'}</div><div className="big">{rupiah(total)}</div></div>
                </div>
                {belum.length > 0 && <Button block className="mt-4" to="/ipl/bayar">Bayar Sekarang</Button>}
                {belum.length === 0 && menunggu.length === 0 && <Alert tone="success">Semua tagihan sudah lunas. Terima kasih!</Alert>}
                {menunggu.length > 0 && <div className="mt-3"><Alert tone="warn">{menunggu.length} pembayaran sedang menunggu verifikasi bendahara.</Alert></div>}
              </Card>
              <Card pad>
                <div className="section-title"><h2>Riwayat Pembayaran</h2><Link to="/ipl/riwayat" className="link-sm">Lihat Semua</Link></div>
                <RiwayatList items={s.data} limit={5} />
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
