import { Lightbulb, Trash2, Building2, ShieldCheck, CalendarDays, MessageSquareText } from 'lucide-react';

export const KATEGORI_PENGUMUMAN = {
  penting: { label: 'Penting', tone: 'bad', ico: 'bad' },
  kegiatan: { label: 'Kegiatan', tone: 'brand', ico: '' },
  info: { label: 'Info', tone: 'info', ico: 'info' },
  umum: { label: 'Umum', tone: '', ico: 'neutral' },
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
  baru: { label: 'Baru', tone: 'info' },
  diproses: { label: 'Diproses', tone: 'warn' },
  selesai: { label: 'Selesai', tone: 'ok' },
  ditolak: { label: 'Tidak ditindaklanjuti', tone: 'bad' },
};

export const STATUS_TAGIHAN = {
  belum_bayar: { label: 'Belum bayar', tone: 'bad' },
  menunggu_verifikasi: { label: 'Menunggu verifikasi', tone: 'warn' },
  lunas: { label: 'Lunas', tone: 'ok' },
};

export const STATUS_WARGA = {
  menunggu: { label: 'Menunggu', tone: 'warn' },
  aktif: { label: 'Aktif', tone: 'ok' },
  ditolak: { label: 'Ditolak', tone: 'bad' },
  nonaktif: { label: 'Nonaktif', tone: '' },
};

export const STATUS_PERNIKAHAN = {
  belum_menikah: { label: 'Belum menikah' },
  menikah: { label: 'Menikah' },
  cerai_hidup: { label: 'Cerai hidup' },
  cerai_mati: { label: 'Cerai mati' },
};

/** Status hunian: rumah yang ditempati milik sendiri atau kontrak (data sensus). */
export const STATUS_HUNIAN = {
  milik_sendiri: { label: 'Milik sendiri' },
  kontrak: { label: 'Kontrak' },
};

/** Jumlah anak ditanyakan bila sudah/pernah menikah. */
export const pernahMenikah = (s) => !!s && s !== 'belum_menikah';

/** "Menikah · 2 anak" / "Belum menikah" / "" bila belum diisi. */
export function labelPernikahan(w) {
  const s = STATUS_PERNIKAHAN[w?.status_pernikahan]?.label;
  if (!s) return '';
  return pernahMenikah(w.status_pernikahan) && w.jumlah_anak != null ? `${s} · ${w.jumlah_anak} anak` : s;
}

export const STATUS_KAS = {
  disetujui: { label: 'Tercatat', tone: 'ok' },
  menunggu: { label: 'Menunggu persetujuan', tone: 'warn' },
  ditolak: { label: 'Ditolak', tone: 'bad' },
};

export const JENIS_DOKUMEN = {
  surat_masuk: { label: 'Surat masuk', tone: 'info' },
  surat_keluar: { label: 'Surat keluar', tone: 'brand' },
  notulen: { label: 'Notulen', tone: 'gold' },
  lainnya: { label: 'Lainnya', tone: '' },
};

export const PERAN = { warga: 'Warga', pengurus: 'Pengurus', admin: 'Admin' };

export const KATEGORI_KAS = {
  pemasukan: ['Iuran IPL', 'Donasi', 'Saldo Awal', 'Sewa Fasilitas', 'Lainnya'],
  pengeluaran: ['Kegiatan', 'Kebersihan', 'Keamanan', 'Perbaikan', 'Listrik & Air', 'Administrasi', 'Sosial', 'Lainnya'],
};
