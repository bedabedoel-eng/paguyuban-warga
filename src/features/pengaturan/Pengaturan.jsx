import { Link } from 'react-router-dom';
import { User, Bell, Lock, Info, LogOut, ChevronRight, SlidersHorizontal, Eye } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function Pengaturan() {
  const { hak, signOut } = useAuth();
  const items = [
    { to: '/profil', label: 'Profil & data diri', sub: 'Foto, pekerjaan, dan informasi keluarga', icon: User },
    { to: '/pengaturan/privasi', label: 'Privasi', sub: 'Siapa yang dapat melihat nomor HP dan email', icon: Eye },
    { to: '/pengaturan/notifikasi', label: 'Notifikasi', sub: 'Pilih pemberitahuan yang ingin diterima', icon: Bell },
    { to: '/pengaturan/keamanan', label: 'Keamanan', sub: 'Ubah PIN dan keluar dari perangkat lain', icon: Lock },
    { to: '/pengaturan/tentang', label: 'Tentang aplikasi', sub: 'Versi dan kebijakan penggunaan data', icon: Info },
  ];
  if (hak.admin) items.unshift({ to: '/admin/pengaturan', label: 'Pengaturan paguyuban', sub: 'Profil paguyuban, iuran, gang, kontak darurat', icon: SlidersHorizontal });
  return (
    <div className="page narrow">
      <PageHeader back title="Pengaturan" />
      <Card>
        <div className="rows inset">
          {items.map(({ to, label, sub, icon: Icon }) => (
            <Link key={to} to={to} className="rowi">
              <span className="ico sm neutral"><Icon size={16} /></span>
              <span className="rowi-main"><span className="rowi-title">{label}</span><span className="rowi-sub">{sub}</span></span>
              <ChevronRight size={18} className="muted" />
            </Link>
          ))}
          <button type="button" className="rowi danger" onClick={signOut}>
            <span className="ico sm bad"><LogOut size={16} /></span>
            <span className="rowi-main"><span className="rowi-title">Keluar</span></span>
          </button>
        </div>
      </Card>
    </div>
  );
}
