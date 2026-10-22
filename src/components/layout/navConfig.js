import {
  House, Receipt, CalendarDays, Megaphone, MessageSquareText, Users, Wallet, UsersRound, LayoutDashboard, LayoutGrid,
  UserCheck, Inbox, Building2, FileCheck2, BadgeCheck, FolderArchive, Settings2, Network, Signpost,
  Bell, PhoneCall, UserRound, Settings, PlusCircle, CalendarPlus, FilePlus2, HandCoins, Vote,
} from 'lucide-react';

/**
 * Daftar menu aplikasi, satu sumber untuk sidebar, halaman "Semua menu", dan menu cepat.
 * badge: kunci di statistik_dashboard untuk lencana jumlah.
 */
export function navGroups(hak) {
  const kelolaWarga = !!(hak.kelola_anggota || hak.humas || hak.admin);
  const warga = {
    label: null,
    items: [
      { to: '/', label: 'Beranda', desc: 'Ringkasan lingkungan', icon: House, tone: '', end: true },
      { to: '/ipl', label: 'Tagihan IPL', desc: 'Bayar & riwayat', icon: Receipt, tone: 'ok', also: ['/ipl'] },
      { to: '/pengumuman', label: 'Pengumuman', desc: 'Kabar dari pengurus', icon: Megaphone, tone: 'info' },
      { to: '/kegiatan', label: 'Kegiatan', desc: 'Agenda lingkungan', icon: CalendarDays, tone: 'violet' },
      { to: '/polling', label: 'Polling', desc: 'Suara warga', icon: Vote, tone: 'info' },
      { to: '/aspirasi', label: 'Aspirasi saya', desc: 'Laporan & usulan', icon: MessageSquareText, tone: 'warn' },
      { to: '/warga', label: kelolaWarga ? 'Warga' : 'Direktori warga', desc: kelolaWarga ? 'Data, import & perbaikan' : 'Kenali tetangga', icon: Users, tone: '' },
      { to: '/keuangan', label: 'Kas paguyuban', desc: 'Laporan terbuka', icon: Wallet, tone: 'gold' },
      { to: '/pengurus', label: 'Pengurus', desc: 'Susunan pengurus', icon: UsersRound, tone: 'violet', end: true },
    ],
  };
  const groups = [warga];
  if (hak.pengurus) {
    const kelola = [{ to: '/admin', label: 'Ringkasan pengurus', desc: 'Tugas sesuai jabatan', icon: LayoutDashboard, tone: 'gold', end: true }];
    if (hak.kelola_anggota || hak.humas) {
      kelola.push({ to: '/admin/verifikasi', label: 'Verifikasi anggota', desc: 'Pendaftar baru', icon: UserCheck, tone: 'gold', badge: 'anggota_menunggu' });
    }
    if (hak.kelola_anggota) kelola.push({ to: '/admin/wilayah', label: 'Blok & jalan', desc: 'Wilayah, ekspor & impor', icon: Signpost, tone: 'info' });
    if (hak.kelola_laporan) kelola.push({ to: '/admin/laporan', label: 'Aspirasi masuk', desc: 'Tanggapi warga', icon: Inbox, tone: 'warn', badge: 'laporan_baru' });
    if (hak.bendahara) {
      kelola.push({ to: '/admin/ipl', label: 'Kelola IPL', desc: 'Tagihan & bukti bayar', icon: FileCheck2, tone: 'ok', badge: 'pembayaran_menunggu' });
      kelola.push({ to: '/admin/rumah', label: 'Data rumah', desc: 'Dasar tagihan', icon: Building2, tone: '' });
    }
    if (hak.setujui_kas) kelola.push({ to: '/keuangan/persetujuan', label: 'Persetujuan kas', desc: 'Pengeluaran besar', icon: BadgeCheck, tone: 'gold', badge: 'pengeluaran_menunggu' });
    kelola.push({ to: '/administrasi', label: 'Surat & notulen', desc: 'Arsip dokumen', icon: FolderArchive, tone: 'neutral' });
    if (hak.kelola_pengurus) kelola.push({ to: '/pengurus/kelola', label: 'Atur pengurus', desc: 'Jabatan & wilayah', icon: Network, tone: 'violet' });
    groups.push({ label: 'Kepengurusan', items: kelola });
  }
  if (hak.admin) {
    groups.push({
      label: 'Sistem',
      items: [
        { to: '/admin/pengaturan', label: 'Pengaturan paguyuban', desc: 'Profil, blok, tarif', icon: Settings2, tone: 'neutral' },
      ],
    });
  }
  return groups;
}

/** Semua menu untuk halaman "Semua menu": menu utama ditambah akun & bantuan. */
export function semuaMenu(hak, { unread = 0 } = {}) {
  const grup = navGroups(hak).map((g, i) => (i === 0 ? { ...g, label: 'Warga', items: g.items.filter((x) => x.to !== '/') } : g));
  grup.push({
    label: 'Akun & bantuan',
    items: [
      { to: '/notifikasi', label: 'Notifikasi', desc: unread ? `${unread} belum dibaca` : 'Semua sudah dibaca', icon: Bell, tone: 'info' },
      { to: '/kontak-darurat', label: 'Kontak darurat', desc: 'Satpam, ambulans, dll.', icon: PhoneCall, tone: 'bad' },
      { to: '/profil', label: 'Profil saya', desc: 'Foto & data diri', icon: UserRound, tone: '' },
      { to: '/pengaturan', label: 'Pengaturan akun', desc: 'PIN, privasi, notifikasi', icon: Settings, tone: 'neutral' },
    ],
  });
  return grup;
}

const SEMUA_MENU = { to: '/menu', label: 'Semua menu', icon: LayoutGrid, tone: 'dark', semua: true };

/**
 * 7 pintasan + tombol "Semua menu" = 8 kotak untuk Beranda.
 * Menu yang sudah ada di bilah bawah (Tagihan, Warga, Kelola/Kegiatan, Profil) tidak diulang di sini.
 * Pengurus punya "Kelola" di bilah bawah sebagai ganti "Kegiatan", jadi Kegiatan masuk di sini untuk mereka.
 */
export function menuCepatWarga(hak = {}) {
  const k = [
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'info' },
    ...(hak.pengurus ? [{ to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays, tone: 'violet' }] : []),
    { to: '/polling', label: 'Polling', icon: Vote, tone: 'info' },
    { to: '/aspirasi', label: 'Aspirasi', icon: MessageSquareText, tone: 'warn' },
    { to: '/keuangan', label: 'Kas paguyuban', icon: Wallet, tone: 'gold' },
    { to: '/pengurus', label: 'Pengurus', icon: UsersRound, tone: 'violet' },
    { to: '/kontak-darurat', label: 'Kontak darurat', icon: PhoneCall, tone: 'bad' },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings, tone: 'neutral' },
  ];
  return [...k.slice(0, 7), SEMUA_MENU];
}

/** 8 kotak untuk dashboard pengurus: pekerjaan sesuai kewenangan lebih dulu, lalu isi dengan menu umum. */
export function menuCepatPengurus(hak) {
  const k = [];
  if (hak.kelola_anggota || hak.humas) k.push({ to: '/admin/verifikasi', label: 'Verifikasi anggota', icon: UserCheck, tone: 'gold', badge: 'anggota_menunggu' });
  if (hak.setujui_kas) k.push({ to: '/keuangan/persetujuan', label: 'Persetujuan kas', icon: BadgeCheck, tone: 'gold', badge: 'pengeluaran_menunggu' });
  if (hak.bendahara) k.push({ to: '/admin/ipl', label: 'Kelola IPL', icon: FileCheck2, tone: 'ok', badge: 'pembayaran_menunggu' });
  if (hak.kelola_laporan) k.push({ to: '/admin/laporan', label: 'Aspirasi masuk', icon: Inbox, tone: 'warn', badge: 'laporan_baru' });
  if (hak.kelola_info) k.push({ to: '/pengumuman/baru', label: 'Buat pengumuman', icon: PlusCircle, tone: 'info' });
  if (hak.kelola_info) k.push({ to: '/kegiatan/baru', label: 'Jadwalkan kegiatan', icon: CalendarPlus, tone: 'violet' });
  if (hak.bendahara) k.push({ to: '/keuangan?catat=1', label: 'Catat kas', icon: HandCoins, tone: 'gold' });
  if (hak.bendahara) k.push({ to: '/admin/ipl', label: 'Terbitkan tagihan', icon: FilePlus2, tone: 'ok', dup: true });
  if (hak.kelola_anggota) k.push({ to: '/admin/wilayah', label: 'Blok & jalan', icon: Signpost, tone: 'info' });
  if (hak.kelola_dokumen) k.push({ to: '/administrasi', label: 'Surat & notulen', icon: FolderArchive, tone: 'neutral' });
  if (hak.kelola_pengurus) k.push({ to: '/pengurus/kelola', label: 'Atur pengurus', icon: Network, tone: 'violet' });
  // Isi cadangan; Tagihan, Warga, dan Profil sudah ada di bilah bawah sehingga tidak diulang.
  k.push(
    { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'info' },
    { to: '/kegiatan', label: 'Kegiatan', icon: CalendarDays, tone: 'violet' },
    { to: '/keuangan', label: 'Kas paguyuban', icon: Wallet, tone: 'gold' },
    { to: '/polling', label: 'Polling', icon: Vote, tone: 'info' },
    { to: '/aspirasi', label: 'Aspirasi', icon: MessageSquareText, tone: 'warn' },
    { to: '/pengurus', label: 'Pengurus', icon: UsersRound, tone: 'violet' },
  );
  const pakai = new Set();
  const tujuh = [];
  for (const x of k) {
    if (x.dup || pakai.has(x.to)) continue;
    pakai.add(x.to); tujuh.push(x);
    if (tujuh.length === 7) break;
  }
  return [...tujuh, SEMUA_MENU];
}
