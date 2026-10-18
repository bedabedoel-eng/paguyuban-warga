import { Link } from 'react-router-dom';
import { Users, Lightbulb, BookOpen, CalendarDays, CircleCheck, Megaphone, Clock, UserRound, Receipt, MessageSquareText, Wallet } from 'lucide-react';
import { StorageImage, Badge } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { tanggal, tanggalJam, jam, BULAN_PENDEK, parseDate } from '../../lib/format';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';

export function Thumb({ path, size = 54 }) {
  const fb = <HouseScene variant="day" wave={false} />;
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {path ? <StorageImage bucket="konten" path={path} fallback={fb} /> : fb}
    </span>
  );
}

const IKON_PENGUMUMAN = {
  penting: { icon: Users, tone: 'tone-orange' },
  info: { icon: Lightbulb, tone: 'tone-blue' },
  umum: { icon: BookOpen, tone: 'tone-gold' },
  kegiatan: { icon: CalendarDays, tone: 'tone-green' },
};

export function PengumumanRow({ p, variant = 'thumb' }) {
  const kat = KATEGORI_PENGUMUMAN[p.kategori];
  const ik = IKON_PENGUMUMAN[p.kategori] || IKON_PENGUMUMAN.umum;
  const Icon = ik.icon;
  return (
    <Link to={`/pengumuman/${p.id}`} className="list-item">
      {variant === 'thumb' ? <Thumb path={p.gambar_path} /> : <span className={`icon-circle ${ik.tone}`} style={{ width: 40, height: 40 }}><Icon size={19} /></span>}
      <span className="grow">
        <span className="title ellipsis" style={{ display: 'block' }}>{p.judul}</span>
        {variant !== 'thumb' && <span className="sub clamp-2" style={{ display: '-webkit-box' }}>{p.ringkasan || p.isi}</span>}
        <span className="sub" style={{ display: 'block' }}>{tanggal(p.created_at, { pendek: false })}</span>
      </span>
      {(variant !== 'thumb' || p.kategori === 'penting') && <Badge tone={kat?.tone}>{kat?.label}</Badge>}
    </Link>
  );
}

export function statusAgenda(k) {
  const now = new Date();
  const m = parseDate(k.mulai);
  const s = parseDate(k.selesai);
  if (now >= m && now <= s) return { label: 'Berlangsung', tone: 'orange' };
  const hari = (m - now) / 86400000;
  if (m.toDateString() === now.toDateString()) return { label: 'Hari Ini', tone: 'orange' };
  if (hari <= 7) return { label: 'Akan Datang', tone: 'green' };
  return { label: 'Mendatang', tone: 'blue' };
}

export function AgendaRow({ k }) {
  const m = parseDate(k.mulai);
  const st = statusAgenda(k);
  return (
    <Link to={`/kegiatan/${k.id}`} className="list-item">
      <span className="date-box"><b>{m.getDate()}</b><span>{BULAN_PENDEK[m.getMonth()]}</span></span>
      <span className="grow">
        <span className="title ellipsis" style={{ display: 'block' }}>{k.judul}</span>
        <span className="sub">{jam(k.mulai)} - {jam(k.selesai)} • {k.lokasi}</span>
      </span>
      <Badge tone={st.tone}>{st.label}</Badge>
    </Link>
  );
}

const IKON_NOTIF = {
  ipl: { icon: CircleCheck, tone: 'tone-green' },
  pengumuman: { icon: Megaphone, tone: 'tone-blue' },
  laporan: { icon: Clock, tone: 'tone-orange' },
  akun: { icon: UserRound, tone: 'tone-purple' },
  kegiatan: { icon: CalendarDays, tone: 'tone-green' },
  umum: { icon: Megaphone, tone: 'tone-blue' },
};

export function NotifRow({ n, big, onClick }) {
  const ik = IKON_NOTIF[n.jenis] || IKON_NOTIF.umum;
  const Icon = ik.icon;
  const Inner = (
    <>
      <span className={`icon-circle ${ik.tone}`} style={{ width: big ? 40 : 34, height: big ? 40 : 34 }}><Icon size={big ? 19 : 16} /></span>
      <span className="grow">
        <span className="title" style={{ display: 'block', fontWeight: n.dibaca_at ? 500 : 600, fontSize: big ? 13 : 12 }}>{n.judul}</span>
        {big && n.isi && <span className="sub ellipsis" style={{ display: 'block' }}>{n.isi}</span>}
        <span className="sub">{tanggalJam(n.created_at)}</span>
      </span>
      {!n.dibaca_at && <span className="unread-dot" aria-label="Belum dibaca" />}
    </>
  );
  if (n.tautan) return <Link to={n.tautan} className="list-item" onClick={onClick}>{Inner}</Link>;
  return <button className="list-item" onClick={onClick}>{Inner}</button>;
}

const IKON_AKT = {
  ipl: { icon: Receipt, tone: 'tone-green', badge: 'green', label: 'IPL' },
  aspirasi: { icon: MessageSquareText, tone: 'tone-blue', badge: 'blue', label: 'Aspirasi' },
  kegiatan: { icon: CalendarDays, tone: 'tone-red', badge: 'purple', label: 'Kegiatan' },
  keuangan: { icon: Wallet, tone: 'tone-green', badge: 'gold', label: 'Keuangan' },
  pengumuman: { icon: Megaphone, tone: 'tone-blue', badge: 'blue', label: 'Pengumuman' },
  anggota: { icon: UserRound, tone: 'tone-purple', badge: 'purple', label: 'Anggota' },
};

export function AktivitasRow({ a }) {
  const ik = IKON_AKT[a.jenis] || IKON_AKT.anggota;
  const Icon = ik.icon;
  return (
    <div className="list-item">
      <span className={`icon-circle ${ik.tone}`} style={{ width: 32, height: 32 }}><Icon size={15} /></span>
      <span className="grow">
        <span style={{ display: 'block', fontSize: 12.5 }}><b>{a.pelaku?.nama || 'Sistem'}</b> {a.teks}</span>
        <span className="sub">{tanggalJam(a.created_at)}</span>
      </span>
      <Badge tone={ik.badge}>{ik.label}</Badge>
    </div>
  );
}
