import { Link } from 'react-router-dom';
import {
  Users, UsersRound, Wallet, MessageSquareText, Settings, Phone,
  LayoutDashboard, Megaphone, Coins, FileText, CalendarDays, UserRound,
  Bell, ShieldCheck, House, UserCheck,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { useAuth } from '../../context/AuthContext';

export default function Menu() {
  const { hak } = useAuth();

  const grupMenu = [
    {
      judul: 'Iuran & Keuangan',
      items: [
        { to: '/ipl', label: 'Tagihan IPL', icon: Coins, tone: 'q-gold' },
        { to: '/ipl/bayar', label: 'Bayar IPL', icon: Wallet, tone: 'q-green' },
        { to: '/ipl/riwayat', label: 'Riwayat IPL', icon: FileText, tone: 'q-blue' },
        { to: '/keuangan', label: 'Kas & Keuangan', icon: Wallet, tone: 'q-teal' },
      ],
    },
    {
      judul: 'Komunitas & Informasi',
      items: [
        { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'q-purple' },
        { to: '/kegiatan', label: 'Agenda Kegiatan', icon: CalendarDays, tone: 'q-green' },
        { to: '/aspirasi', label: 'Aspirasi & Lapor', icon: MessageSquareText, tone: 'q-gold' },
        { to: '/warga', label: 'Direktori Warga', icon: Users, tone: 'q-blue' },
        { to: '/pengurus', label: 'Susunan Pengurus', icon: UsersRound, tone: 'q-teal' },
        { to: '/kontak-darurat', label: 'Kontak Darurat', icon: Phone, tone: 'q-red' },
      ],
    },
    {
      judul: 'Akun & Pengaturan',
      items: [
        { to: '/profil', label: 'Profil Saya', icon: UserRound, tone: 'q-blue' },
        { to: '/notifikasi', label: 'Notifikasi', icon: Bell, tone: 'q-gold' },
        { to: '/pengaturan/keamanan', label: 'Ubah PIN', icon: ShieldCheck, tone: 'q-green' },
        { to: '/pengaturan', label: 'Pengaturan', icon: Settings, tone: 'q-purple' },
      ],
    },
  ];

  const menuPengurus = [
    { to: '/admin', label: 'Dashboard Admin', icon: LayoutDashboard, tone: 'q-green' },
    { to: '/admin/verifikasi', label: 'Verifikasi Warga', icon: UserCheck, tone: 'q-purple' },
    ...(hak.bendahara ? [{ to: '/admin/ipl', label: 'Kelola IPL', icon: Coins, tone: 'q-gold' }] : []),
    { to: '/admin/warga', label: 'Data Warga', icon: Users, tone: 'q-blue' },
    { to: '/admin/rumah', label: 'Data Rumah', icon: House, tone: 'q-teal' },
    { to: '/admin/laporan', label: 'Kelola Laporan', icon: MessageSquareText, tone: 'q-red' },
    ...(hak.admin ? [{ to: '/admin/pengaturan', label: 'Pengaturan RT', icon: Settings, tone: 'q-purple' }] : []),
  ];

  return (
    <>
      <PageHeader title="Semua Menu" />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          {hak.pengurus && (
            <Card pad>
              <h2 className="mb-3">Menu Pengurus & Admin</h2>
              <div className="quick8">
                {menuPengurus.map(({ to, label, icon: Icon, tone }) => (
                  <Link key={to} to={to} className="q8-item">
                    <span className={`icon-circle ${tone}`}><Icon size={22} /></span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {grupMenu.map((g) => (
            <Card key={g.judul} pad>
              <h2 className="mb-3">{g.judul}</h2>
              <div className="quick8">
                {g.items.map(({ to, label, icon: Icon, tone }) => (
                  <Link key={to} to={to} className="q8-item">
                    <span className={`icon-circle ${tone}`}><Icon size={22} /></span>
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}

          <div className="promo">
            <div className="scene"><HouseScene variant="day" wave={false} /></div>
            <p>Bersama kita membangun lingkungan yang lebih baik</p>
          </div>
        </div>
      </div>
    </>
  );
}
