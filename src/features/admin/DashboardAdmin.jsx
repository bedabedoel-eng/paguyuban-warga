import { Link } from 'react-router-dom';
import {
  Users, House, UsersRound, ChevronRight, UserCheck, FileCheck2,
  MessageSquareText, Coins, CalendarPlus, Megaphone, Wallet, Settings, LayoutGrid,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, ProgressRing, Loader, ErrorState, Button, SectionTitle, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { statistik, statistikIplBulanan, aktivitasTerbaru } from '../../services/dashboard';
import { AktivitasRow } from '../beranda/widgets';
import IplChart from '../beranda/IplChart';
import { angka, rupiah, periode } from '../../lib/format';

export default function DashboardAdmin() {
  const { hak } = useAuth();
  const s = useAsync(statistik, []);
  const chart = useAsync(() => statistikIplBulanan(new Date().getFullYear()), []);
  const akt = useAsync(() => aktivitasTerbaru(6), []);
  const d = s.data || {};
  const total = (d.ipl_lunas || 0) + (d.ipl_belum || 0);
  const persen = total ? (d.ipl_lunas / total) * 100 : 0;

  const tugas = [
    { to: '/admin/verifikasi', icon: UserCheck, label: 'Verifikasi Anggota Baru', v: d.anggota_menunggu, sub: 'pendaftar menunggu persetujuan', tone: 'tone-purple' },
    ...(hak.bendahara ? [{ to: '/admin/ipl', icon: FileCheck2, label: 'Verifikasi Bukti IPL', v: d.pembayaran_menunggu, sub: 'bukti transfer perlu dicek', tone: 'tone-gold' }] : []),
    { to: '/admin/laporan', icon: MessageSquareText, label: 'Laporan & Aspirasi Warga', v: d.laporan_baru, sub: 'laporan aktif perlu ditangani', tone: 'tone-orange' },
  ];

  const menuAdmin = [
    { to: '/admin/verifikasi', label: 'Verifikasi', icon: UserCheck, tone: 'q-purple', badge: d.anggota_menunggu },
    { to: hak.bendahara ? '/admin/ipl' : '/ipl', label: 'Kelola IPL', icon: Coins, tone: 'q-gold', badge: hak.bendahara ? d.pembayaran_menunggu : 0 },
    { to: '/keuangan', label: 'Kas RT', icon: Wallet, tone: 'q-blue' },
    { to: '/admin/warga', label: 'Data Warga', icon: Users, tone: 'q-green' },
    { to: '/admin/rumah', label: 'Data Rumah', icon: House, tone: 'q-teal' },
    { to: '/admin/laporan', label: 'Laporan', icon: MessageSquareText, tone: 'q-red', badge: d.laporan_baru },
    { to: '/pengumuman/baru', label: '+ Info Baru', icon: Megaphone, tone: 'q-purple' },
    { to: hak.admin ? '/admin/pengaturan' : '/kegiatan/baru', label: hak.admin ? 'Pengaturan' : '+ Kegiatan', icon: hak.admin ? Settings : CalendarPlus, tone: 'q-green' },
  ];

  return (
    <>
      <PageHeader title="Dashboard Admin" back={false} />
      <div className="page">
        <div className="page-inner">
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
            <>
              {/* 4 Kartu Statistik Utama (Grid 2x2 di HP, 4 kolom di Desktop) */}
              <div className="admin-stats">
                <Link to="/admin/warga" className="card admin-stat" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="icon-circle" style={{ width: 40, height: 40 }}><Users size={19} /></span>
                  <span className="v">{angka(d.total_warga)}</span>
                  <span className="l">Warga Aktif ({angka(d.kepala_keluarga)} KK)</span>
                </Link>
                <Link to="/admin/rumah" className="card admin-stat" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="icon-circle tone-blue" style={{ width: 40, height: 40 }}><House size={19} /></span>
                  <span className="v">{angka(d.rumah_dihuni)}/{angka(d.total_rumah)}</span>
                  <span className="l">Rumah Dihuni</span>
                </Link>
                <Link to="/pengurus" className="card admin-stat" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="icon-circle tone-purple" style={{ width: 40, height: 40 }}><UsersRound size={19} /></span>
                  <span className="v">{angka(d.pengurus_aktif)}</span>
                  <span className="l">Pengurus Aktif</span>
                </Link>
                <Link to="/keuangan" className="card admin-stat" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="icon-circle tone-gold" style={{ width: 40, height: 40 }}><Coins size={19} /></span>
                  <span className="v">{rupiah(d.saldo_kas)}</span>
                  <span className="l">Saldo Kas Paguyuban</span>
                </Link>
              </div>

              {/* 8 Menu Cepat Kelola Admin (Grid 4x2) */}
              <Card pad>
                <SectionTitle title="Menu Cepat Pengurus" />
                <nav className="quick8" aria-label="Menu cepat admin">
                  {menuAdmin.map(({ to, label, icon: Icon, tone, badge }) => (
                    <Link key={to + label} to={to} className="q8-item">
                      <span className={`icon-circle ${tone}`} style={{ position: 'relative' }}>
                        <Icon size={22} />
                        {badge > 0 && <span className="q8-badge">{badge > 9 ? '9+' : badge}</span>}
                      </span>
                      <span>{label}</span>
                    </Link>
                  ))}
                </nav>
                <div className="row wrap mt-3" style={{ gap: 8 }}>
                  <Button size="sm" variant="outline" icon={CalendarPlus} to="/kegiatan/baru">Buat Kegiatan</Button>
                  <Button size="sm" variant="outline" icon={LayoutGrid} to="/menu">Semua Menu Warga</Button>
                </div>
              </Card>

              {/* Antrean Tugas yang Perlu Ditangani */}
              <div className="admin-tasks stack">
                {tugas.map(({ to, icon: Icon, label, v, sub, tone }) => (
                  <Link key={to} to={to} className="card admin-task" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <span className={`icon-circle ${tone}`} style={{ width: 44, height: 44 }}><Icon size={20} /></span>
                    <span className="grow">
                      <span className="l" style={{ display: 'block' }}>{label}</span>
                      <span className="small muted">{sub}</span>
                    </span>
                    <Badge tone={v > 0 ? 'orange' : 'green'}>{v ?? 0}</Badge>
                    <ChevronRight size={18} className="muted" />
                  </Link>
                ))}
              </div>

              {/* Ringkasan & Progress IPL Bulan Berjalan */}
              <Card pad>
                <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
                  <ProgressRing value={persen} size={84} stroke={10} />
                  <div className="grow" style={{ minWidth: 160 }}>
                    <h2>Progres Tagihan IPL</h2>
                    <p className="small muted">
                      {d.periode_ipl ? `${periode(d.periode_ipl)} • Target ${rupiah(d.ipl_total_tagihan)}` : 'Belum ada tagihan diterbitkan'}
                    </p>
                    <p className="small mt-1">
                      <b className="green">{angka(d.ipl_lunas)}</b> KK lunas • <b className="red">{angka(d.ipl_belum)}</b> KK belum bayar
                    </p>
                  </div>
                  {hak.bendahara && <Button size="sm" to="/admin/ipl">Kelola IPL</Button>}
                </div>
              </Card>

              {/* Grafik IPL Bulanan */}
              <Card pad>
                <div className="row between mb-2" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <h2>Grafik IPL Tahun {new Date().getFullYear()}</h2>
                  <span className="row tiny text-2" style={{ gap: 12 }}>
                    <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: '#0b6b4f' }} />Lunas</span>
                    <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: '#d6dbe1' }} />Belum</span>
                  </span>
                </div>
                {chart.data && <IplChart data={chart.data} />}
              </Card>

              {/* Log Aktivitas Terbaru */}
              <Card pad>
                <SectionTitle title="Aktivitas Lingkungan Terbaru" />
                {akt.data?.length ? (
                  <div className="list">{akt.data.map((a) => <AktivitasRow key={a.id} a={a} />)}</div>
                ) : (
                  <p className="small muted">Belum ada aktivitas.</p>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
