import { Link } from 'react-router-dom';
import { User, ShieldCheck, Bell, Lock, Globe, Info, LogOut, ChevronRight, SlidersHorizontal, Eye } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Pengaturan() {
  const { hak, signOut } = useAuth();
  const items = [
    { to: '/pengaturan/akun', label: 'Informasi Akun', icon: User },
    { to: '/pengaturan/privasi', label: 'Privasi Profil', icon: Eye },
    { to: '/pengaturan/notifikasi', label: 'Notifikasi', icon: Bell },
    { to: '/pengaturan/keamanan', label: 'Keamanan', icon: Lock },
    { to: '/pengaturan/bahasa', label: 'Bahasa', icon: Globe },
    { to: '/pengaturan/tentang', label: 'Tentang Aplikasi', icon: Info },
  ];
  if (hak.admin) items.unshift({ to: '/admin/pengaturan', label: 'Pengaturan Paguyuban', icon: SlidersHorizontal });
  return (
    <>
      <PageHeader title="Pengaturan" back={false} />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad className="menu-list">
          <div className="list">
            {items.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="list-item"><Icon size={20} className="lead" /><span className="lbl">{label}</span><ChevronRight size={18} className="muted" /></Link>
            ))}
            <button className="list-item danger" onClick={signOut}><LogOut size={20} className="lead" /><span className="lbl">Keluar</span></button>
          </div>
        </Card>
      </div>
    </>
  );
}
