import { House, Users, Database, CalendarDays, Megaphone, MessageSquareText, ChartColumn, UsersRound, Bell, Settings, LayoutDashboard } from 'lucide-react';

/** Menu sidebar desktop, disaring sesuai hak akses. */
export function sidebarItems(hak) {
  const warga = [{ to: '/warga', label: 'Direktori Warga' }];
  if (hak.pengurus) warga.push({ to: '/admin/verifikasi', label: 'Verifikasi Anggota' }, { to: '/admin/warga', label: 'Data Warga' });
  if (hak.admin || hak.bendahara) warga.push({ to: '/admin/rumah', label: 'Data Rumah' });
  if (hak.admin) warga.push({ to: '/admin/import', label: 'Import Warga' });
  const ipl = [{ to: '/ipl', label: 'Tagihan Saya', end: true }, { to: '/ipl/riwayat', label: 'Riwayat Pembayaran' }];
  if (hak.bendahara) ipl.push({ to: '/admin/ipl', label: 'Kelola IPL' });
  const items = [
    { to: '/', label: 'Beranda', icon: House, end: true },
    { label: 'Warga', icon: Users, base: ['/warga', '/admin/verifikasi', '/admin/warga', '/admin/rumah', '/admin/import'], children: warga },
    { label: 'IPL', icon: Database, base: ['/ipl', '/admin/ipl'], children: ipl },
    { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays },
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
    { to: hak.pengurus ? '/admin/laporan' : '/aspirasi', label: 'Aspirasi & Laporan', icon: MessageSquareText, also: ['/aspirasi', '/admin/laporan'] },
    { to: '/keuangan', label: 'Keuangan', icon: ChartColumn },
    { to: '/pengurus', label: 'Pengurus', icon: UsersRound },
    { to: '/notifikasi', label: 'Notifikasi', icon: Bell, badge: 'notif' },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings, also: ['/profil', '/pengaturan', '/admin/pengaturan'] },
  ];
  if (hak.pengurus) items.push({ sep: true }, { to: '/admin', label: 'Panel Admin', icon: LayoutDashboard, end: true });
  return items;
}
