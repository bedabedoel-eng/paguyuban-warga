import { Link } from 'react-router-dom';
import { Users, UsersRound, Wallet, MessageSquareText, Megaphone, Phone, Settings, LayoutDashboard, Bell, FolderArchive, Receipt, CalendarDays, LogOut, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNotif } from '../../context/NotifContext';

export default function Menu() {
  const { hak, warga, peranLabel, signOut } = useAuth();
  const { unread } = useNotif();
  const items = [
    ...(hak.pengurus ? [{ to: '/admin', label: 'Ringkasan pengurus', s: 'Tugas sesuai jabatan', icon: LayoutDashboard, tone: 'gold' }] : []),
    { to: '/notifikasi', label: 'Notifikasi', s: unread ? `${unread} belum dibaca` : 'Semua sudah dibaca', icon: Bell, tone: 'info' },
    { to: '/pengumuman', label: 'Pengumuman', s: 'Kabar dari pengurus', icon: Megaphone, tone: 'info' },
    { to: '/kegiatan', label: 'Kegiatan', s: 'Agenda lingkungan', icon: CalendarDays, tone: '' },
    { to: '/ipl', label: 'Tagihan IPL', s: 'Bayar & riwayat', icon: Receipt, tone: 'ok' },
    { to: '/keuangan', label: 'Kas paguyuban', s: 'Laporan terbuka', icon: Wallet, tone: 'gold' },
    { to: '/aspirasi', label: 'Aspirasi', s: 'Laporan & usulan', icon: MessageSquareText, tone: 'warn' },
    { to: '/warga', label: 'Direktori warga', s: 'Kenali tetangga', icon: Users, tone: '' },
    { to: '/pengurus', label: 'Pengurus', s: 'Susunan pengurus', icon: UsersRound, tone: 'violet' },
    { to: '/administrasi', label: hak.pengurus ? 'Surat & notulen' : 'Notulen rapat', s: 'Arsip dokumen', icon: FolderArchive, tone: 'neutral' },
    { to: '/kontak-darurat', label: 'Kontak darurat', s: 'Satpam, ambulans, dll.', icon: Phone, tone: 'bad' },
  ];
  return (
    <div className="page">
      <PageHeader title="Menu" />
      <Link to="/profil" className="card me-card">
        <Avatar nama={warga?.nama} path={warga?.foto_path} size={52} />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="strong ellipsis" style={{ display: 'block', fontSize: 'var(--fs-lg)' }}>{warga?.nama}</span>
          <span className="text-sm muted">{peranLabel} · Blok {warga?.blok} No. {warga?.no_rumah}</span>
        </span>
        <ChevronRight size={18} className="muted" />
      </Link>
      <div className="tiles">
        {items.map(({ to, label, s, icon: Icon, tone }) => (
          <Link key={to} to={to} className="card tile">
            <span className={`ico ${tone}`}><Icon size={20} /></span>
            <span><span className="l" style={{ display: 'block' }}>{label}</span><span className="s">{s}</span></span>
          </Link>
        ))}
      </div>
      <Card>
        <div className="rows inset">
          <Link to="/pengaturan" className="rowi"><span className="ico sm neutral"><Settings size={16} /></span><span className="rowi-main"><span className="rowi-title">Pengaturan akun</span></span><ChevronRight size={18} className="muted" /></Link>
          <button type="button" className="rowi danger" onClick={signOut}><span className="ico sm bad"><LogOut size={16} /></span><span className="rowi-main"><span className="rowi-title">Keluar</span></span></button>
        </div>
      </Card>
    </div>
  );
}
