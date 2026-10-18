import { Lightbulb, Trash2, Building2, ShieldCheck, CalendarDays, MessageSquareText } from 'lucide-react';

export const KATEGORI_PENGUMUMAN = {
  penting: { label: 'Penting', tone: 'red' },
  kegiatan: { label: 'Kegiatan', tone: 'green' },
  info: { label: 'Info', tone: 'blue' },
  umum: { label: 'Umum', tone: 'green' },
};

export const KATEGORI_LAPORAN = {
  lampu_jalan: { label: 'Lampu Jalan', icon: Lightbulb },
  sampah: { label: 'Sampah', icon: Trash2 },
  fasilitas: { label: 'Fasilitas', icon: Building2 },
  keamanan: { label: 'Keamanan', icon: ShieldCheck },
  usulan_kegiatan: { label: 'Usulan Kegiatan', icon: CalendarDays },
  keluhan: { label: 'Keluhan', icon: MessageSquareText },
};

export const STATUS_LAPORAN = {
  baru: { label: 'Terkirim', tone: 'blue' },
  diproses: { label: 'Diproses', tone: 'orange' },
  selesai: { label: 'Selesai', tone: 'green' },
  ditolak: { label: 'Ditolak', tone: 'red' },
};

export const STATUS_TAGIHAN = {
  belum_bayar: { label: 'Belum Bayar', tone: 'red' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', tone: 'orange' },
  lunas: { label: 'Lunas', tone: 'green' },
};

export const STATUS_WARGA = {
  menunggu: { label: 'Menunggu', tone: 'orange' },
  aktif: { label: 'Anggota Aktif', tone: 'green' },
  ditolak: { label: 'Ditolak', tone: 'red' },
  nonaktif: { label: 'Nonaktif', tone: '' },
};

export const PERAN = { warga: 'Warga', pengurus: 'Pengurus', admin: 'Admin' };

export const KATEGORI_KAS = {
  pemasukan: ['Iuran IPL', 'Donasi', 'Saldo Awal', 'Sewa Fasilitas', 'Lainnya'],
  pengeluaran: ['Kegiatan', 'Kebersihan', 'Keamanan', 'Perbaikan', 'Listrik & Air', 'Administrasi', 'Sosial', 'Lainnya'],
};
