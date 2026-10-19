import { Link } from 'react-router-dom';
import {
  Signpost, CalendarDays, Megaphone, MessageSquareText, UserRound, Receipt, Wallet, Pin, FileText,
  UserCheck, Inbox, FileCheck2, BadgeCheck, FolderArchive, ImageIcon, Users,
} from 'lucide-react';
import { StorageImage, Badge, FotoWarga } from '../../components/ui';
import { tanggal, jam, relatif, BULAN_PENDEK, parseDate, rupiah } from '../../lib/format';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';
import { useSettings } from '../../context/SettingsContext';
import { labelSasaran } from '../../lib/alamat';
import { namaWilayah } from '../../lib/akses';
import { kodeRumah } from '../../lib/alamat';

export function Thumb({ path, size = 56 }) {
  const fb = <span className="thumb-fallback"><ImageIcon size={Math.round(size * 0.36)} /></span>;
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {path ? <StorageImage bucket="konten" path={path} fallback={fb} /> : fb}
    </span>
  );
}

export function PengumumanRow({ p, thumb = true }) {
  const kat = KATEGORI_PENGUMUMAN[p.kategori] || KATEGORI_PENGUMUMAN.umum;
  const { gang } = useSettings();
  const target = labelSasaran(p, gang);
  return (
    <Link to={`/pengumuman/${p.id}`} className="rowi">
      {thumb ? <Thumb path={p.gambar_path} size={52} /> : <span className={`ico ${kat.ico}`}><Megaphone size={18} /></span>}
      <span className="rowi-main">
        <span className="rowi-title clamp-2">{p.disematkan && <Pin size={13} className="t-warn" style={{ marginRight: 4, verticalAlign: '-1px' }} aria-label="Disematkan" />}{p.judul}</span>
        <span className="rowi-sub">{tanggal(p.created_at, { pendek: true })}{target ? ` · Khusus ${target}` : ''}</span>
      </span>
      {p.kategori !== 'umum' && <Badge tone={kat.tone}>{kat.label}</Badge>}
    </Link>
  );
}

export function statusAgenda(k) {
  const now = new Date();
  const m = parseDate(k.mulai);
  const s = parseDate(k.selesai);
  if (now >= m && now <= s) return { label: 'Berlangsung', tone: 'warn' };
  if (s < now) return { label: 'Selesai', tone: '' };
  if (m.toDateString() === now.toDateString()) return { label: 'Hari ini', tone: 'warn' };
  const besok = new Date(now); besok.setDate(now.getDate() + 1);
  if (m.toDateString() === besok.toDateString()) return { label: 'Besok', tone: 'brand' };
  return null;
}

export function AgendaRow({ k }) {
  const m = parseDate(k.mulai);
  const st = statusAgenda(k);
  return (
    <Link to={`/kegiatan/${k.id}`} className="rowi">
      <span className="date-chip"><b>{m.getDate()}</b><span>{BULAN_PENDEK[m.getMonth()]}</span></span>
      <span className="rowi-main">
        <span className="rowi-title ellipsis">{k.judul}</span>
        <span className="rowi-sub ellipsis">{jam(k.mulai)}–{jam(k.selesai)} · {k.lokasi}</span>
      </span>
      {st && <Badge tone={st.tone}>{st.label}</Badge>}
    </Link>
  );
}

const IKON_NOTIF = {
  ipl: { icon: Receipt, tone: 'ok' },
  pengumuman: { icon: Megaphone, tone: 'info' },
  laporan: { icon: MessageSquareText, tone: 'warn' },
  akun: { icon: UserRound, tone: 'violet' },
  kegiatan: { icon: CalendarDays, tone: '' },
  keuangan: { icon: Wallet, tone: 'gold' },
  administrasi: { icon: FileText, tone: 'neutral' },
  umum: { icon: Megaphone, tone: 'info' },
};

export function NotifRow({ n, onClick, detail = true }) {
  const ik = IKON_NOTIF[n.jenis] || IKON_NOTIF.umum;
  const Icon = ik.icon;
  const inner = (
    <>
      <span className={`ico sm round ${ik.tone}`}><Icon size={16} /></span>
      <span className="rowi-main">
        <span className="rowi-title">{n.judul}</span>
        {detail && n.isi && <span className="rowi-sub clamp-2">{n.isi}</span>}
        <span className="rowi-sub text-xs">{relatif(n.created_at)}</span>
      </span>
      {!n.dibaca_at && <span className="dot-unread" aria-label="Belum dibaca" />}
    </>
  );
  const cls = `rowi ${n.dibaca_at ? 'read' : 'unread'}`;
  if (n.tautan) return <Link to={n.tautan} className={cls} onClick={onClick}>{inner}</Link>;
  return <button type="button" className={cls} onClick={onClick}>{inner}</button>;
}

const IKON_AKT = {
  ipl: { icon: Receipt, tone: 'ok' },
  aspirasi: { icon: MessageSquareText, tone: 'warn' },
  kegiatan: { icon: CalendarDays, tone: '' },
  keuangan: { icon: Wallet, tone: 'gold' },
  pengumuman: { icon: Megaphone, tone: 'info' },
  anggota: { icon: UserRound, tone: 'violet' },
  administrasi: { icon: FileText, tone: 'neutral' },
};

export function AktivitasRow({ a }) {
  const ik = IKON_AKT[a.jenis] || IKON_AKT.anggota;
  const Icon = ik.icon;
  return (
    <div className="rowi">
      <span className={`ico sm round ${ik.tone}`}><Icon size={15} /></span>
      <span className="rowi-main">
        <span className="text-sm"><b>{a.pelaku?.nama || 'Sistem'}</b> {a.teks}</span>
        <span className="rowi-sub text-xs">{relatif(a.created_at)}</span>
      </span>
    </div>
  );
}

/** Kartu pekerjaan yang menunggu, sesuai kewenangan. */
export function daftarTugas(hak, s = {}, gang = []) {
  const t = [];
  if (hak.kelola_anggota || hak.humas) t.push({ to: '/admin/verifikasi', icon: UserCheck, l: 'Pendaftar baru', s: hak.kelola_anggota ? 'Menunggu verifikasi' : `Di ${namaWilayah(hak, gang)}`, n: s.anggota_menunggu });
  if (hak.kelola_laporan) t.push({ to: '/admin/laporan', icon: Inbox, l: 'Aspirasi warga', s: 'Belum selesai ditangani', n: s.laporan_baru });
  if (hak.bendahara) t.push({ to: '/admin/ipl', icon: FileCheck2, l: 'Bukti bayar IPL', s: 'Perlu diverifikasi', n: s.pembayaran_menunggu });
  if (hak.setujui_kas) t.push({ to: '/keuangan/persetujuan', icon: BadgeCheck, l: 'Persetujuan pengeluaran', s: s.pengeluaran_menunggu ? rupiah(s.pengeluaran_menunggu_nominal) : 'Menunggu keputusan Anda', n: s.pengeluaran_menunggu });
  else if (hak.lihat_kas_detail) t.push({ to: '/keuangan/persetujuan', icon: BadgeCheck, l: 'Pengeluaran diajukan', s: 'Menunggu keputusan Ketua', n: s.pengeluaran_menunggu, info: true });
  if (hak.kelola_dokumen) t.push({ to: '/administrasi', icon: FolderArchive, l: 'Arsip bulan ini', s: 'Surat & notulen', n: s.dokumen_bulan_ini, info: true });
  return t;
}

export function TugasGrid({ hak, stat, loading }) {
  const { gang } = useSettings();
  const t = daftarTugas(hak, stat || {}, gang);
  if (!t.length) return null;
  return (
    <div className="tasks">
      {t.map(({ to, icon: Icon, l, s, n, info }) => {
        const v = n ?? 0;
        const attn = v > 0 && !info;
        return (
          <Link key={to + l} to={to} className={`task ${attn ? 'attn' : v === 0 ? 'idle' : ''}`}>
            <span className={`ico ${attn ? 'gold' : 'neutral'}`}><Icon size={18} /></span>
            <span className="t"><span className="l" style={{ display: 'block' }}>{l}</span><span className="s" style={{ display: 'block' }}>{s}</span></span>
            <span className="n" aria-label={`${v}`}>{loading ? '…' : v}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** Ringkasan jalan untuk humas. */
export function WilayahCards({ wilayah = [] }) {
  if (!wilayah?.length) return null;
  return (
    <div className="wil">
      {wilayah.map((w) => {
        const tot = (w.ipl_lunas || 0) + (w.ipl_belum || 0);
        return (
          <div className="card" key={w.gang}>
            <div className="head"><span className="ico"><Signpost size={18} /></span><span className="grow" style={{ minWidth: 0 }}><b className="ellipsis" style={{ display: 'block' }}>{w.nama}</b>{w.blok && <span className="text-xs muted">Blok {w.blok}</span>}</span><Link className="link" to={`/admin/warga?gang=${w.gang}`}>Data warga</Link></div>
            <div className="nums">
              <div><b>{w.warga}</b><span>Warga aktif</span></div>
              <div><b>{w.menunggu}</b><span>Pendaftar</span></div>
              <div><b>{w.laporan_aktif}</b><span>Aspirasi aktif</span></div>
            </div>
            <div className="stack-sm">
              <div className="row between text-sm"><span className="muted">IPL bulan berjalan</span><span className="num strong">{w.ipl_lunas}/{tot} lunas</span></div>
              <div className="meter"><i style={{ width: `${tot ? (w.ipl_lunas / tot) * 100 : 0}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/** Jajaran foto 3:4 bergulir ke samping, tautan ke profil warga. */
export function FotoStrip({ rows = [], to = '/warga', moreLabel = 'Direktori', sub }) {
  if (!rows.length) return null;
  return (
    <div className="strip">
      {rows.map((w) => (
        <Link key={w.id} to={`/warga/${w.id}`} className="strip-item">
          <FotoWarga nama={w.nama} path={w.foto_path} />
          <span className="nm">{w.nama}</span>
          <span className="mt">{sub ? sub(w) : kodeRumah(w)}</span>
        </Link>
      ))}
      <Link to={to} className="strip-more"><span className="ico round"><Users size={18} /></span>{moreLabel}</Link>
    </div>
  );
}

/** Batang sebaran jumlah (mis. warga per blok). rows: [{ key, label, sub?, value, to? }] */
export function Sebaran({ rows = [] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => {
        const isi = (
          <>
            <span className="lb">{r.label}{r.sub && <small>{r.sub}</small>}</span>
            <span className="meter" aria-hidden="true"><i style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="v">{r.value}</span>
          </>
        );
        return r.to ? <Link key={r.key} to={r.to} className="b" style={{ color: 'inherit', textDecoration: 'none' }}>{isi}</Link> : <div key={r.key} className="b">{isi}</div>;
      })}
    </div>
  );
}
