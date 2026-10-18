import { Link } from 'react-router-dom';
import {
  Users, UsersRound, Coins, CalendarDays, Sun, CloudSun, Cloud, CloudRain, CircleCheck, MapPin, House, LayoutGrid,
  Leaf, UserRound, FileText, Megaphone, ChartColumn, MessageCircle, Phone, ChevronRight, Building2, Map, Bell,
} from 'lucide-react';
import { Avatar, Card, CardHead, Button, Skeleton, EmptyState, ProgressRing, StorageImage } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useBerandaData, ringkasIpl } from './useBerandaData';
import IplChart from './IplChart';
import { PengumumanRow, AgendaRow, NotifRow, AktivitasRow } from './widgets';
import { labelCuaca } from '../../services/dashboard';
import { rupiah, angka, tanggal, periode } from '../../lib/format';
import { publicUrl } from '../../lib/storage';
import { STATUS_TAGIHAN } from '../../lib/constants';

const AKSES = [
  { to: '/warga', label: 'Kenali Tetangga', icon: Users, tone: 'q-green' },
  { to: '/profil', label: 'Profil Saya', icon: UserRound, tone: 'q-blue' },
  { to: '/ipl', label: 'Bayar IPL', icon: Coins, tone: 'q-gold' },
  { to: '/ipl/riwayat', label: 'Riwayat IPL', icon: FileText, tone: 'q-green' },
  { to: '/pengurus', label: 'Pengurus', icon: UsersRound, tone: 'q-teal' },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'q-purple' },
  { to: '/kegiatan', label: 'Agenda Kegiatan', icon: CalendarDays, tone: 'q-purple' },
  { to: '/keuangan', label: 'Laporan Keuangan', icon: ChartColumn, tone: 'q-blue' },
  { to: '/aspirasi', label: 'Aspirasi Warga', icon: MessageCircle, tone: 'q-gold' },
  { to: '/kontak-darurat', label: 'Kontak Darurat', icon: Phone, tone: 'q-red' },
];

function IkonCuaca({ kode, size = 26 }) {
  if (kode == null) return <Sun size={size} color="#f5b301" />;
  if (kode === 0) return <Sun size={size} color="#f5b301" />;
  if (kode <= 2) return <CloudSun size={size} color="#f5b301" />;
  if (kode <= 48) return <Cloud size={size} color="#8a94a3" />;
  return <CloudRain size={size} color="#3b82f6" />;
}

function Stat({ icon: Icon, tone = 'tone-green', label, value, sub, to, loading }) {
  const body = (
    <>
      <span className={`icon-circle ${tone}`} style={{ width: 52, height: 52 }}><Icon size={24} /></span>
      <span className="grow">
        <span className="stat-label">{label}</span>
        {loading ? <Skeleton h={26} w={80} style={{ margin: '4px 0' }} /> : <span className="stat-value">{value}</span>}
        <span className="stat-sub">{sub}</span>
      </span>
      {to && <ChevronRight size={16} className="muted" style={{ alignSelf: 'flex-end' }} />}
    </>
  );
  return to ? <Link to={to} className="card stat-card">{body}</Link> : <div className="card stat-card">{body}</div>;
}

export default function BerandaDesktop() {
  const { warga, hak } = useAuth();
  const { pengaturan } = useSettings();
  const d = useBerandaData({ desktop: true });
  const s = d.stat.data || {};
  const statLoading = d.stat.loading && !d.stat.data;
  const totalIpl = (s.ipl_lunas || 0) + (s.ipl_belum || 0);
  const persen = totalIpl ? (s.ipl_lunas / totalIpl) * 100 : 0;
  const r = ringkasIpl(d.ipl.data);
  const t = r.terbaru;
  const hero = pengaturan.foto_lingkungan ? publicUrl(pengaturan.foto_lingkungan) : null;

  return (
    <div className="page dash">
      <div className="dash-main">
        {/* Sambutan */}
        <section className="welcome">
          <Avatar nama={warga?.nama} path={warga?.foto_path} size={64} />
          <div className="grow">
            <h1>Selamat datang, {warga?.nama}!</h1>
            <p className="text-2">Semoga hari ini membawa hal yang baik untuk kita semua.</p>
          </div>
          <div className="welcome-meta">
            <span className="row text-2 small"><CalendarDays size={18} />{tanggal(new Date(), { hari: true })}</span>
            {d.weather.data && (
              <span className="row weather">
                <IkonCuaca kode={d.weather.data.kode} />
                <span><b>{d.weather.data.suhu}°C</b><span className="tiny muted" style={{ display: 'block' }}>{labelCuaca(d.weather.data.kode)}</span></span>
              </span>
            )}
          </div>
        </section>

        {/* Statistik */}
        <section className="stats4">
          <Stat icon={Users} label="Total Warga" value={angka(s.total_warga)} sub={`Kepala Keluarga: ${angka(s.kepala_keluarga)}`} loading={statLoading} />
          <Stat icon={UsersRound} label="Pengurus Aktif" value={angka(s.pengurus_aktif)} sub={`Dari ${angka(s.pengurus_total)} Pengurus`} loading={statLoading} />
          <Stat icon={Coins} tone="tone-gold" label="Total Tagihan IPL" value={rupiah(s.ipl_total_tagihan)} sub={s.periode_ipl ? `Periode ${periode(s.periode_ipl)}` : 'Belum ada tagihan'} to={hak.bendahara ? '/admin/ipl' : '/ipl'} loading={statLoading} />
          <div className="card stat-card">
            <ProgressRing value={persen} size={66} stroke={8} />
            <span className="grow">
              <span className="stat-label">Pembayaran IPL</span>
              <span className="kv tight"><span>Lunas:</span><span>{angka(s.ipl_lunas)} KK</span></span>
              <span className="kv tight"><span>Belum:</span><span>{angka(s.ipl_belum)} KK</span></span>
            </span>
          </div>
        </section>

        {/* Grafik + status + pengumuman */}
        <section className="dash-row3">
          <Card>
            <div className="card-head">
              <h2>Grafik Pembayaran IPL</h2>
              <span className="row tiny text-2" style={{ gap: 14 }}>
                <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: '#0b6b4f' }} />Lunas</span>
                <span className="row" style={{ gap: 5 }}><i className="dot" style={{ background: '#d6dbe1' }} />Belum Bayar</span>
              </span>
            </div>
            <div className="card-body">
              {d.chart.loading && !d.chart.data ? <Skeleton h={180} /> : <IplChart data={d.chart.data} />}
            </div>
          </Card>

          <Card>
            <CardHead title="Status IPL Saya" />
            <div className="card-body">
              {d.ipl.loading && !d.ipl.data ? <Skeleton h={150} /> : t ? (
                <>
                  <div className={`ipl-status ${t.status}`}>
                    <CircleCheck size={30} />
                    <b>{STATUS_TAGIHAN[t.status].label}</b>
                  </div>
                  <div className="kv"><span>Periode</span><span>{periode(t.periode)}</span></div>
                  <div className="kv"><span>Nominal</span><span>{rupiah(t.nominal)}</span></div>
                  <div className="kv"><span>{t.status === 'lunas' ? 'Tanggal Bayar' : 'Jatuh Tempo'}</span><span>{tanggal(t.status === 'lunas' ? t.dibayar_at : t.jatuh_tempo)}</span></div>
                  <Button block size="sm" className="mt-3" to={t.status === 'belum_bayar' ? '/ipl/bayar' : '/ipl/riwayat'}>
                    {t.status === 'belum_bayar' ? 'Bayar Sekarang' : 'Lihat Riwayat'}
                  </Button>
                </>
              ) : (
                <EmptyState icon={Coins} title="Belum ada tagihan" text={warga?.rumah_id ? 'Tagihan IPL akan muncul setelah diterbitkan bendahara.' : 'Akun Anda belum terhubung ke rumah.'} />
              )}
            </div>
          </Card>

          <Card>
            <CardHead title="Pengumuman Terbaru" to="/pengumuman" />
            <div className="card-body">
              {d.pengumuman.loading && !d.pengumuman.data ? <Skeleton h={150} />
                : d.pengumuman.data?.length ? <div className="list">{d.pengumuman.data.map((p) => <PengumumanRow key={p.id} p={p} variant="icon" />)}</div>
                  : <EmptyState icon={Megaphone} title="Belum ada pengumuman" />}
            </div>
          </Card>
        </section>

        {/* Akses cepat + agenda */}
        <section className="dash-row4">
          <Card>
            <CardHead title="Akses Cepat" />
            <div className="card-body">
              <div className="quick10">
                {AKSES.map(({ to, label, icon: Icon, tone }) => (
                  <Link key={to} to={to} className={`qtile ${tone}`}>
                    <Icon size={26} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <CardHead title="Agenda Terdekat" to="/kegiatan" />
            <div className="card-body">
              {d.agenda.loading && !d.agenda.data ? <Skeleton h={160} />
                : d.agenda.data?.length ? <div className="list">{d.agenda.data.map((k) => <AgendaRow key={k.id} k={k} />)}</div>
                  : <EmptyState icon={CalendarDays} title="Belum ada agenda" />}
            </div>
          </Card>
        </section>

        {/* Aktivitas + banner + kontak */}
        <section className="dash-row5">
          <Card>
            <CardHead title="Aktivitas Terbaru" />
            <div className="card-body">
              {d.aktivitas.loading && !d.aktivitas.data ? <Skeleton h={160} />
                : d.aktivitas.data?.length ? <div className="list">{d.aktivitas.data.map((a) => <AktivitasRow key={a.id} a={a} />)}</div>
                  : <EmptyState icon={LayoutGrid} title="Belum ada aktivitas" />}
            </div>
          </Card>
          <div className="banner">
            <HouseScene variant="day" wave={false} className="banner-bg" />
            <div className="banner-overlay" />
            <div className="banner-content">
              <Leaf size={30} />
              <h2>Bersama Kita<br />Jaga Lingkungan Kita</h2>
              <p>Partisipasi Anda sangat berarti untuk lingkungan yang lebih baik</p>
              <Button variant="gold" size="sm" icon={CalendarDays} to="/kegiatan">Lihat Kegiatan</Button>
            </div>
          </div>
          <Card>
            <CardHead title="Kontak Darurat" to="/kontak-darurat" icon={Phone} />
            <div className="card-body">
              {d.kontak.data?.length ? (
                <div className="list">
                  {d.kontak.data.slice(0, 4).map((k) => (
                    <a key={k.id} href={`tel:${k.nomor.replace(/[^\d+]/g, '')}`} className="list-item">
                      <span className="icon-circle tone-red" style={{ width: 34, height: 34 }}><Phone size={15} /></span>
                      <span className="grow"><span className="title" style={{ display: 'block', fontSize: 12.5 }}>{k.nama}</span><span className="sub">{k.nomor}</span></span>
                    </a>
                  ))}
                </div>
              ) : <EmptyState icon={Phone} title="Belum ada kontak" />}
            </div>
          </Card>
        </section>
      </div>

      {/* Kolom kanan */}
      <aside className="dash-side">
        <div className="hero">
          {hero ? <img src={hero} alt="" className="hero-img" /> : <HouseScene variant="day" wave={false} className="hero-img" />}
          <div className="hero-overlay" />
          <div className="hero-text">
            <h2>RT {pengaturan.rt} / RW {pengaturan.rw}</h2>
            <p className="bold">{pengaturan.nama_lingkungan}</p>
            {pengaturan.alamat && <p className="row small"><MapPin size={14} />{pengaturan.alamat}</p>}
          </div>
        </div>
        <Card className="info-env">
          <div className="info-env-head"><span className="icon-square" style={{ width: 34, height: 34, background: 'var(--emerald)', color: '#fff' }}><Building2 size={18} /></span><h2>Informasi Lingkungan</h2></div>
          <div className="card-body">
            <div className="kv"><span className="row"><House size={16} />Total Rumah</span><span>{angka(s.total_rumah)}</span></div>
            <div className="kv"><span className="row"><Map size={16} />RT</span><span>{pengaturan.rt || '-'}</span></div>
            <div className="kv"><span className="row"><Map size={16} />RW</span><span>{pengaturan.rw || '-'}</span></div>
            <div className="kv"><span className="row"><LayoutGrid size={16} />Luas Wilayah</span><span>{pengaturan.luas_wilayah || '-'}</span></div>
          </div>
        </Card>
        <Card>
          <CardHead title="Notifikasi" to="/notifikasi" icon={Bell} />
          <div className="card-body">
            {d.notif.loading && !d.notif.data ? <Skeleton h={200} />
              : d.notif.data?.length ? <div className="list">{d.notif.data.map((n) => <NotifRow key={n.id} n={n} big />)}</div>
                : <EmptyState icon={Bell} title="Tidak ada notifikasi" />}
          </div>
        </Card>
      </aside>
    </div>
  );
}
