import { Link } from 'react-router-dom';
import { Users, House, UsersRound, Receipt, ChevronRight, UserCheck, FileCheck2, MessageSquareText, Coins, CalendarPlus, Megaphone } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ProgressRing, Loader, ErrorState, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { statistik, aktivitasTerbaru } from '../../services/dashboard';
import { AktivitasRow } from '../beranda/widgets';
import { angka, rupiah, periode } from '../../lib/format';

export default function DashboardAdmin() {
  const { hak } = useAuth();
  const s = useAsync(statistik, []);
  const akt = useAsync(() => aktivitasTerbaru(6), []);
  const d = s.data || {};
  const total = (d.ipl_lunas || 0) + (d.ipl_belum || 0);
  const persen = total ? (d.ipl_lunas / total) * 100 : 0;
  const tugas = [
    { to: '/admin/verifikasi', icon: UserCheck, label: 'Verifikasi Anggota', v: d.anggota_menunggu, sub: 'menunggu' },
    ...(hak.bendahara ? [{ to: '/admin/ipl', icon: FileCheck2, label: 'Transaksi Menunggu Verifikasi', v: d.pembayaran_menunggu, sub: 'bukti pembayaran' }] : []),
    { to: '/admin/laporan', icon: MessageSquareText, label: 'Laporan Terbaru', v: d.laporan_baru, sub: 'perlu ditangani' },
  ];
  return (
    <>
      <PageHeader title="Dashboard Admin" back={false} />
      <div className="page">
        <div className="page-inner">
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
            <>
              <div className="admin-stats">
                <Card className="admin-stat"><span className="icon-circle" style={{ width: 40, height: 40 }}><Users size={19} /></span><span className="v">{angka(d.total_warga)}</span><span className="l">Total Warga</span></Card>
                <Card className="admin-stat"><span className="icon-circle" style={{ width: 40, height: 40 }}><House size={19} /></span><span className="v">{angka(d.rumah_dihuni)}</span><span className="l">KK / Rumah</span></Card>
                <Card className="admin-stat"><span className="icon-circle" style={{ width: 40, height: 40 }}><UsersRound size={19} /></span><span className="v">{angka(d.pengurus_aktif)}</span><span className="l">Pengurus Aktif</span></Card>
                <Card className="admin-stat"><span className="icon-circle tone-gold" style={{ width: 40, height: 40 }}><Coins size={19} /></span><span className="v">{rupiah(d.saldo_kas)}</span><span className="l">Saldo Kas</span></Card>
              </div>
              <Card pad>
                <div className="row" style={{ gap: 18 }}>
                  <ProgressRing value={persen} size={84} stroke={10} />
                  <div className="grow">
                    <h2>Pembayaran IPL</h2>
                    <p className="small muted">{d.periode_ipl ? periode(d.periode_ipl) : 'Belum ada tagihan'}</p>
                    <p className="small mt-1"><b className="green">{angka(d.ipl_lunas)}</b> KK lunas • <b className="red">{angka(d.ipl_belum)}</b> KK belum</p>
                  </div>
                  {hak.bendahara && <Button size="sm" variant="outline" to="/admin/ipl">Kelola</Button>}
                </div>
              </Card>
              <div className="admin-tasks stack">
                {tugas.map(({ to, icon: Icon, label, v, sub }) => (
                  <Link key={to} to={to} className="card admin-task" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span className="icon-circle" style={{ width: 44, height: 44 }}><Icon size={20} /></span>
                    <span className="grow"><span className="l" style={{ display: 'block' }}>{label}</span><span className="small muted">{sub}</span></span>
                    <span className="v">{v ?? 0}</span><ChevronRight size={18} className="muted" />
                  </Link>
                ))}
              </div>
              <div className="row wrap">
                <Button size="sm" variant="outline" icon={Megaphone} to="/pengumuman/baru">Buat Pengumuman</Button>
                <Button size="sm" variant="outline" icon={CalendarPlus} to="/kegiatan/baru">Buat Kegiatan</Button>
                {hak.admin && <Button size="sm" variant="outline" to="/admin/pengaturan">Pengaturan Paguyuban</Button>}
              </div>
              <Card pad>
                <div className="section-title"><h2>Aktivitas Terbaru</h2></div>
                {akt.data?.length ? <div className="list">{akt.data.map((a) => <AktivitasRow key={a.id} a={a} />)}</div> : <p className="small muted">Belum ada aktivitas.</p>}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
