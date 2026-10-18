import {
  House, Receipt, CalendarDays, Megaphone, MessageSquareText, Users, Wallet, UsersRound, LayoutDashboard,
  UserCheck, IdCard, Inbox, Building2, FileCheck2, BadgeCheck, FolderArchive, Settings2, FileUp, Network,
} from 'lucide-react';

/**
 * Menu sidebar dikelompokkan dan disaring sesuai hak.
 * badge: kunci di statistik_dashboard untuk lencana jumlah.
 */
export function navGroups(hak) {
  const warga = {
    label: null,
    items: [
      { to: '/', label: 'Beranda', icon: House, end: true },
      { to: '/ipl', label: 'Tagihan IPL', icon: Receipt, also: ['/ipl'] },
      { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone },
      { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays },
      { to: '/aspirasi', label: 'Aspirasi saya', icon: MessageSquareText },
      { to: '/warga', label: 'Direktori warga', icon: Users },
      { to: '/keuangan', label: 'Kas paguyuban', icon: Wallet },
      { to: '/pengurus', label: 'Pengurus', icon: UsersRound, end: true },
    ],
  };
  const groups = [warga];
  if (hak.pengurus) {
    const kelola = [{ to: '/admin', label: 'Ringkasan pengurus', icon: LayoutDashboard, end: true }];
    if (hak.kelola_anggota || hak.humas) {
      kelola.push({ to: '/admin/verifikasi', label: 'Verifikasi anggota', icon: UserCheck, badge: 'anggota_menunggu' });
      kelola.push({ to: '/admin/warga', label: 'Data anggota', icon: IdCard });
    }
    if (hak.kelola_laporan) kelola.push({ to: '/admin/laporan', label: 'Aspirasi masuk', icon: Inbox, badge: 'laporan_baru' });
    if (hak.bendahara) {
      kelola.push({ to: '/admin/ipl', label: 'Kelola IPL', icon: FileCheck2, badge: 'pembayaran_menunggu' });
      kelola.push({ to: '/admin/rumah', label: 'Data rumah', icon: Building2 });
    }
    if (hak.setujui_kas) kelola.push({ to: '/keuangan/persetujuan', label: 'Persetujuan kas', icon: BadgeCheck, badge: 'pengeluaran_menunggu' });
    kelola.push({ to: '/administrasi', label: 'Surat & notulen', icon: FolderArchive });
    if (hak.kelola_pengurus) kelola.push({ to: '/pengurus/kelola', label: 'Atur pengurus', icon: Network });
    groups.push({ label: 'Kepengurusan', items: kelola });
  }
  if (hak.admin) {
    groups.push({
      label: 'Sistem',
      items: [
        { to: '/admin/pengaturan', label: 'Pengaturan paguyuban', icon: Settings2 },
        { to: '/admin/import', label: 'Import warga', icon: FileUp },
      ],
    });
  }
  return groups;
}
