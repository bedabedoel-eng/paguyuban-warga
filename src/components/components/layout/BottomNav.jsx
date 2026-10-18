import { NavLink } from 'react-router-dom';
import { House, Users, FileText, CalendarDays, User } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Beranda', icon: House, end: true },
  { to: '/warga', label: 'Warga', icon: Users },
  { to: '/ipl', label: 'IPL', icon: FileText },
  { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays },
  { to: '/profil', label: 'Profil', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <span className="ic"><Icon size={isActive ? 17 : 21} strokeWidth={isActive ? 2.4 : 2} /></span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
