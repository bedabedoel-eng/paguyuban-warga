import { Link } from 'react-router-dom';
import { Users, UsersRound, Wallet, MessageSquareText, ScrollText, Settings, Phone, LayoutDashboard, Megaphone } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { useAuth } from '../../context/AuthContext';

export default function Menu() {
  const { hak } = useAuth();
  const items = [
    { to: '/warga', label: 'Direktori Warga', icon: Users },
    { to: '/pengurus', label: 'Pengurus', icon: UsersRound },
    { to: '/keuangan', label: 'Keuangan', icon: Wallet },
    { to: '/aspirasi', label: 'Aspirasi', icon: MessageSquareText },
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
    { to: '/kontak-darurat', label: 'Kontak Darurat', icon: Phone },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
    ...(hak.pengurus ? [{ to: '/admin', label: 'Panel Admin', icon: LayoutDashboard }] : []),
  ];
  return (
    <>
      <PageHeader title="Menu" />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          <div className="menu-grid">
            {items.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="card menu-tile"><Icon size={30} />{label}</Link>)}
          </div>
          <div className="promo"><div className="scene"><HouseScene variant="day" wave={false} /></div><p>Bersama kita membangun lingkungan yang lebih baik</p></div>
        </div>
      </div>
    </>
  );
}
