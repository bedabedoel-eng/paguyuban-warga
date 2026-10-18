import { NavLink } from 'react-router-dom';
import { House, Receipt, CalendarDays, LayoutDashboard, Users, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTugas } from '../../context/TugasContext';

export default function BottomNav() {
  const { hak } = useAuth();
  const { total } = useTugas();
  const items = [
    { to: '/', label: 'Beranda', icon: House, end: true },
    { to: '/ipl', label: 'Tagihan', icon: Receipt },
    { to: '/warga', label: 'Direktori', icon: Users },
    hak.pengurus
      ? { to: '/admin', label: 'Kelola', icon: LayoutDashboard, n: total }
      : { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays },
    { to: '/menu', label: 'Menu', icon: LayoutGrid },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {items.map(({ to, label, icon: Icon, end, n }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          {({ isActive }) => (
            <>
              <span className="ic"><Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" /></span>
              {label}
              {n > 0 && <span className="count">{n > 99 ? '99+' : n}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
