import { Link } from 'react-router-dom';
import {
  Bell, Users, CalendarDays, MessageSquareText, LayoutGrid, Receipt, Megaphone,
  Wallet, Phone, Coins, ShieldAlert, ChevronRight, Sun, CloudSun, Cloud, CloudRain, House,
} from 'lucide-react';
import { Avatar, Card, SectionTitle, Skeleton, EmptyState, Badge } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { useSettings } from '../../context/SettingsContext';
import { useBerandaData, ringkasIpl } from './useBerandaData';
import { PengumumanRow, AgendaRow, AktivitasRow } from './widgets';
import { STATUS_TAGIHAN } from '../../lib/constants';
import { rupiah, angka, periode } from '../../lib/format';
import { labelCuaca } from '../../services/dashboard';

const MENU_CEPAT = [
  { to: '/ipl', label: 'Bayar IPL', icon: Coins, tone: 'q-gold' },
  { to: '/keuangan', label: 'Kas Warga', icon: Wallet, tone: 'q-blue' },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'q-purple' },
  { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays, tone: 'q-green' },
  { to: '/aspirasi', label: 'Aspirasi', icon: MessageSquareText, tone: 'q-teal' },
  { to: '/warga', label: 'Warga', icon: Users, tone: 'q-green' },
  { to: '/kontak-darurat', label: 'Darurat', icon: Phone, tone: 'q-red' },
  { to: '/menu', label: 'Semua Menu', icon: LayoutGrid, tone: 'q-blue' },
];

function IkonCuaca({ kode, size = 16 }) {
  if (kode == null || kode === 0) return <Sun size={size} color="#fde047" />;
  if (kode <= 2) return <CloudSun size={size} color="#fde047" />;
  if (kode <= 48) return <Cloud size={size} color="#e2e8f0" />;
  return <CloudRain size={size} color="#93c5fd" />;
}

export default function BerandaMobile() {
  const { warga, hak } = useAuth();
  const { unread } = useNotif();
  const { pengaturan } = useSettings();
  const { ipl, pengumuman, stat, agenda, aktivitas, weather } = useBerandaData({ desktop: false });

  const r = ringkasIpl(ipl.data);
  const st = r.terbaru ? STATUS_TAGIHAN[r.terbaru.status] : null;
  const s = stat.data || {};
  const totalIpl = (s.ipl_lunas || 0) + (s.ipl_belum || 0);
  const persenIpl = totalIpl ? Math.round((s.ipl_lunas / totalIpl) * 100) : 0;

  const antreanAdmin = (s.anggota_menunggu || 0) + (hak.bendahara ? (s.pembayaran_menunggu || 0) : 0) + (s.laporan_baru || 0);

  return (
    <div className="home-m">
      <header className="home-head">
        <Link to="/profil" className="row" style={{ color: '#fff', textDecoration: 'none', gap: 12, minWidth: 0 }}>
          <Avatar nama={warga?.nama} path={warga?.foto_path} size={46} ring />
          <span style={{ minWidth: 0 }}>
            <span className="small" style={{ display: 'block', opacity: 0.9 }}>
              RT {pengaturan.rt}/{pengaturan.rw} • {warga?.blok ? `Blok ${warga.blok}-${warga.no_rumah}` : pengaturan.nama_lingkungan}
            </span>
            <span className="bold ellipsis" style={{ fontSize: 16, display: 'block' }}>{warga?.nama}!</span>
            {weather.data && (
              <span className="row tiny" style={{ gap: 5, opacity: 0.92, marginTop: 2 }}>
                <IkonCuaca kode={weather.data.kode} />
                <span>{weather.data.suhu}°C • {labelCuaca(weather.data.kode)}</span>
              </span>
            )}
          </span>
        </Link>
        <Link to="/notifikasi" className="icon-btn bell" aria-label={`Notifikasi, ${unread} belum dibaca`}>
          <Bell size={22} />
          {unread > 0 && <span className="count-dot">{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </header>

      <div className="home-body">
        {/* Kartu Utama Status IPL */}
        <Link to={r.terbaru?.status === 'belum_bayar' ? '/ipl/bayar' : '/ipl'} className="ipl-card">
          <div className="ipl-card-col">
            <span className="row small" style={{ gap: 6 }}>
              <Receipt size={15} />
              <span>IPL {r.terbaru ? periode(r.terbaru.periode) : 'Bulan Ini'}</span>
            </span>
            {ipl.loading && !ipl.data ? (
              <Skeleton h={26} w={90} style={{ opacity: 0.3, marginTop: 6 }} />
            ) : (
              <b className="big">{r.terbaru ? (r.terbaru.status === 'lunas' ? 'Lunas ✓' : st.label) : 'Belum ada'}</b>
            )}
            <span className="tiny" style={{ opacity: 0.9, marginTop: 2 }}>
              {r.totalBelum > 0 ? `Tagihan aktif: ${rupiah(r.totalBelum)}` : 'Terima kasih sudah tertib iuran'}
            </span>
          </div>
          <div className="ipl-card-sep" />
          <div className="ipl-card-col right">
            <span className="small">Lunas Tahun Ini</span>
            <b className="big">{r.lunasTahunIni}<span style={{ fontSize: 14, fontWeight: 500 }}>/{r.totalTahunIni}</span></b>
            <span className="tiny">{r.terbaru?.status === 'belum_bayar' ? 'Ketuk untuk bayar →' : 'Lihat riwayat →'}</span>
          </div>
        </Link>

        {/* Pintasan Pengurus / Admin bila memiliki akses */}
        {hak.pengurus && (
          <Link to="/admin" className="card admin-banner-m">
            <span className="icon-circle tone-gold" style={{ width: 38, height: 38 }}><ShieldAlert size={19} /></span>
            <span className="grow">
              <b style={{ display: 'block', fontSize: 13 }}>Panel Pengurus & Admin</b>
              <span className="tiny text-2">
                {antreanAdmin > 0 ? `${antreanAdmin} tugas menunggu verifikasi/tindakan` : 'Kelola warga, IPL, kas & pengumuman'}
              </span>
            </span>
            {antreanAdmin > 0 && <Badge tone="orange">{antreanAdmin}</Badge>}
            <ChevronRight size={18} className="muted" />
          </Link>
        )}

        {/* 3 Kotak Statistik Ringkas Lingkungan */}
        <div className="mini-stats3">
          <Link to="/keuangan" className="card mini-stat">
            <span className="tiny muted">Saldo Kas RT</span>
            <b>{stat.loading && !stat.data ? '...' : rupiah(s.saldo_kas || 0)}</b>
          </Link>
          <Link to="/warga" className="card mini-stat">
            <span className="tiny muted">Warga Aktif</span>
            <b>{stat.loading && !stat.data ? '...' : `${angka(s.total_warga || 0)} (${angka(s.rumah_dihuni || 0)} KK)`}</b>
          </Link>
          <Link to="/ipl" className="card mini-stat">
            <span className="tiny muted">IPL Lingkungan</span>
            <b className="green">{stat.loading && !stat.data ? '...' : `${persenIpl}% Lunas`}</b>
          </Link>
        </div>

        {/* 8 Menu Cepat (Grid 4x2) */}
        <Card pad>
          <SectionTitle title="Menu Cepat" to="/menu" linkLabel="Semua" />
          <nav className="quick8" aria-label="Menu cepat">
            {MENU_CEPAT.map(({ to, label, icon: Icon, tone }) => (
              <Link key={to} to={to} className="q8-item">
                <span className={`icon-circle ${tone}`}><Icon size={22} /></span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </Card>

        {/* Pengumuman Terbaru */}
        <Card pad>
          <SectionTitle title="Pengumuman Terbaru" to="/pengumuman" />
          {pengumuman.loading && !pengumuman.data ? (
            <div className="stack sm">{[1, 2].map((i) => <Skeleton key={i} h={54} />)}</div>
          ) : pengumuman.data?.length ? (
            <div className="list">{pengumuman.data.map((p) => <PengumumanRow key={p.id} p={p} />)}</div>
          ) : (
            <EmptyState icon={Megaphone} title="Belum ada pengumuman" />
          )}
        </Card>

        {/* Agenda Kegiatan Terdekat */}
        <Card pad>
          <SectionTitle title="Agenda Kegiatan" to="/kegiatan" />
          {agenda.loading && !agenda.data ? (
            <div className="stack sm">{[1, 2].map((i) => <Skeleton key={i} h={54} />)}</div>
          ) : agenda.data?.length ? (
            <div className="list">{agenda.data.map((k) => <AgendaRow key={k.id} k={k} />)}</div>
          ) : (
            <EmptyState icon={CalendarDays} title="Belum ada agenda terdekat" />
          )}
        </Card>

        {/* Aktivitas Lingkungan Terbaru */}
        <Card pad>
          <SectionTitle title="Aktivitas Lingkungan" />
          {aktivitas.loading && !aktivitas.data ? (
            <div className="stack sm">{[1, 2].map((i) => <Skeleton key={i} h={48} />)}</div>
          ) : aktivitas.data?.length ? (
            <div className="list">{aktivitas.data.map((a) => <AktivitasRow key={a.id} a={a} />)}</div>
          ) : (
            <EmptyState icon={House} title="Belum ada aktivitas terbaru" />
          )}
        </Card>

        {/* Promo Ilustrasi Bawah */}
        <div className="promo">
          <div className="scene"><HouseScene variant="day" wave={false} /></div>
          <p>{pengaturan.tagline || 'Bersama kita membangun lingkungan yang lebih baik'}</p>
        </div>
      </div>
    </div>
  );
}
