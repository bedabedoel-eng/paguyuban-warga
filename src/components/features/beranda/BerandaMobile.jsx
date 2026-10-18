import { Link } from 'react-router-dom';
import { Bell, Users, CalendarDays, MessageSquareText, Ellipsis, Receipt, Megaphone } from 'lucide-react';
import { Avatar, Card, SectionTitle, Skeleton, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';
import { useBerandaData, ringkasIpl } from './useBerandaData';
import { PengumumanRow } from './widgets';
import { STATUS_TAGIHAN } from '../../lib/constants';

const AKSI = [
  { to: '/pengumuman', label: 'Pengumuman', icon: Users },
  { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays },
  { to: '/aspirasi', label: 'Aspirasi', icon: MessageSquareText },
  { to: '/menu', label: 'Lainnya', icon: Ellipsis },
];

export default function BerandaMobile() {
  const { warga } = useAuth();
  const { unread } = useNotif();
  const { ipl, pengumuman } = useBerandaData({ desktop: false });
  const r = ringkasIpl(ipl.data);
  const st = r.terbaru ? STATUS_TAGIHAN[r.terbaru.status] : null;

  return (
    <div className="home-m">
      <header className="home-head">
        <Link to="/profil" className="row" style={{ color: '#fff', textDecoration: 'none', gap: 12 }}>
          <Avatar nama={warga?.nama} path={warga?.foto_path} size={46} ring />
          <span>
            <span className="small" style={{ display: 'block', opacity: 0.9 }}>Selamat datang,</span>
            <span className="bold" style={{ fontSize: 16 }}>{warga?.nama}!</span>
          </span>
        </Link>
        <Link to="/notifikasi" className="icon-btn bell" aria-label={`Notifikasi, ${unread} belum dibaca`}>
          <Bell size={22} />
          {unread > 0 && <span className="count-dot">{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </header>

      <div className="home-body">
        <Link to="/ipl" className="ipl-card">
          <div className="ipl-card-col">
            <span className="row small"><Receipt size={15} /> Status IPL</span>
            {ipl.loading && !ipl.data ? <Skeleton h={26} w={90} style={{ opacity: 0.3, marginTop: 6 }} />
              : <b className="big">{r.terbaru ? (r.terbaru.status === 'lunas' ? 'Lunas' : st.label) : 'Belum ada'}</b>}
          </div>
          <div className="ipl-card-sep" />
          <div className="ipl-card-col right">
            <span className="small">Bulan Lunas</span>
            <b className="big">{r.lunasTahunIni}</b>
            <span className="tiny">Dari {r.totalTahunIni}</span>
          </div>
        </Link>

        <nav className="quick4" aria-label="Akses cepat">
          {AKSI.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <span className="icon-circle"><Icon size={22} /></span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

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
      </div>
    </div>
  );
}
