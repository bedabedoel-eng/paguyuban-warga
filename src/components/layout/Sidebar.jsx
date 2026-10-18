import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Coins, Users, UsersRound, Wallet, MessageSquareText,
  Megaphone, CalendarDays, Phone, Settings, ShieldCheck, LogOut, Bell
} from 'lucide-react';
import { Avatar, Badge } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotif } from '../../context/NotifContext';
import { keluar } from '../../services/auth';

const MENU = [
  { to: '/', label: 'Beranda', icon: LayoutDashboard },
  { to: '/ipl', label: 'Tagihan IPL', icon: Coins },
  { to: '/warga', label: 'Direktori Warga', icon: Users },
  { to: '/pengurus', label: 'Pengurus RT', icon: UsersRound },
  { to: '/keuangan', label: 'Kas & Keuangan', icon: Wallet },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
  { to: '/kegiatan', label: 'Agenda Kegiatan', icon: CalendarDays },
  { to: '/aspirasi', label: 'Aspirasi Warga', icon: MessageSquareText },
  { to: '/notifikasi', label: 'Notifikasi', icon: Bell, notif: true },
  { to: '/kontak-darurat', label: 'Kontak Darurat', icon: Phone },
  { to: '/pengaturan', label: 'Pengaturan Akun', icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { warga, hak } = useAuth();
  const { pengaturan } = useSettings();
  const { unread } = useNotif();

  return (
    <aside className="sidebar">
      {/* Header Sidebar yang Lebih Ringkas & Ramping */}
      <div className="sidebar-head">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <Avatar nama={warga?.nama} path={warga?.foto_path} size={38} />
          <div className="grow" style={{ minWidth: 0 }}>
            <span className="bold ellipsis" style={{ display: 'block', fontSize: 13.5 }}>{warga?.nama}</span>
            <span className="tiny muted ellipsis" style={{ display: 'block' }}>
              {pengaturan.nama_lingkungan} • RT {pengaturan.rt}
            </span>
          </div>
        </div>
      </div>

      {/* Daftar Menu Navigasi Utama */}
      <nav className="sidebar-nav">
        {MENU.map(({ to, label, icon: Icon, notif }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={18} />
              <span className="grow">{label}</span>
              {notif && unread > 0 && <Badge tone="green">{unread > 9 ? '9+' : unread}</Badge>}
            </Link>
          );
        })}

        {/* Menu Khusus Pengurus / Admin */}
        {hak.pengurus && (
          <>
            <div className="sidebar-divider" />
            <Link to="/admin" className={`sidebar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span className="grow">Panel Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Tombol Keluar di Bagian Bawah */}
      <div className="sidebar-foot">
        <button onClick={() => keluar()} className="sidebar-link danger">
          <LogOut size={18} />
          <span className="grow">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
