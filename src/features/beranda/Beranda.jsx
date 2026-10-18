import { Link } from 'react-router-dom';
import {
  Sun, CloudSun, Cloud, CloudRain, CalendarDays, Megaphone, Bell, Phone, Users, Receipt, MessageSquareText,
  Wallet, ShieldCheck, CircleCheck, Clock, CircleAlert, ChevronRight, House, PhoneCall,
} from 'lucide-react';
import { Card, CardHead, CardBody, Button, Stat, SkeletonRows, EmptyState, Skeleton } from '../../components/ui';
import { Roofline } from '../../components/illustrations/Logo';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTugas } from '../../context/TugasContext';
import { useNotif } from '../../context/NotifContext';
import { useBerandaData, ringkasIpl } from './useBerandaData';
import { PengumumanRow, AgendaRow, NotifRow, TugasGrid, WilayahCards } from './widgets';
import { labelCuaca } from '../../services/dashboard';
import { rupiah, angka, tanggal, periode, salam } from '../../lib/format';

function IkonCuaca({ kode, size = 24 }) {
  if (kode == null || kode === 0) return <Sun size={size} color="#e6c67a" />;
  if (kode <= 2) return <CloudSun size={size} color="#e6c67a" />;
  if (kode <= 48) return <Cloud size={size} color="#cfe0d7" />;
  return <CloudRain size={size} color="#9cc3ff" />;
}

const PINTASAN = [
  { to: '/warga', label: 'Kenali tetangga', icon: Users, tone: '' },
  { to: '/pengumuman', label: 'Pengumuman', icon: Megaphone, tone: 'info' },
  { to: '/aspirasi', label: 'Sampaikan aspirasi', icon: MessageSquareText, tone: 'warn' },
  { to: '/kontak-darurat', label: 'Kontak darurat', icon: PhoneCall, tone: 'bad' },
];

function KartuTagihan({ ipl, rumahId }) {
  const r = ringkasIpl(ipl.data);
  if (ipl.loading && !ipl.data) return <CardBody><SkeletonRows n={2} avatar={false} /></CardBody>;
  if (!rumahId) return <CardBody><EmptyState compact icon={House} title="Akun belum terhubung ke rumah" text="Hubungi sekretaris atau humas gang Anda." /></CardBody>;
  if (!r.terbaru) return <CardBody><EmptyState compact icon={Receipt} title="Belum ada tagihan" text="Tagihan muncul setelah bendahara menerbitkannya." /></CardBody>;
  const adaTunggakan = r.belum.length > 0;
  const st = adaTunggakan ? 'belum_bayar' : r.menunggu.length ? 'menunggu_verifikasi' : 'lunas';
  const Icon = st === 'lunas' ? CircleCheck : st === 'belum_bayar' ? CircleAlert : Clock;
  return (
    <CardBody className="bill">
      <div>
        <div className="text-sm muted">{adaTunggakan ? (r.belum.length > 1 ? `${r.belum.length} bulan belum dibayar` : `Tagihan ${periode(r.belum[0].periode)}`) : 'Tagihan terakhir'}</div>
        <div className="amount">{rupiah(adaTunggakan ? r.totalBelum : r.terbaru.nominal)}</div>
      </div>
      <div className={`bill-state ${st}`}>
        <Icon size={20} />
        <div>
          <b>{st === 'lunas' ? 'Semua tagihan lunas' : st === 'belum_bayar' ? 'Belum dibayar' : 'Bukti sedang diperiksa bendahara'}</b>
          <span>{st === 'belum_bayar' ? `Jatuh tempo ${tanggal(r.belum[0].jatuh_tempo, { pendek: true })}` : `${r.lunasTahunIni} dari ${r.totalTahunIni} bulan lunas tahun ini`}</span>
        </div>
      </div>
      {adaTunggakan
        ? <Button block to="/ipl/bayar" icon={Receipt}>Bayar sekarang</Button>
        : <Button block variant="secondary" to="/ipl/riwayat">Lihat riwayat pembayaran</Button>}
    </CardBody>
  );
}

export default function Beranda() {
  const { warga, hak, peranLabel } = useAuth();
  const { pengaturan } = useSettings();
  const { stat, refresh } = useTugas();
  const { refresh: refreshNotif } = useNotif();
  const d = useBerandaData();
  const s = stat || {};
  const totalIpl = (s.ipl_lunas || 0) + (s.ipl_belum || 0);
  const persen = totalIpl ? Math.round((s.ipl_lunas / totalIpl) * 100) : 0;
  const kas = d.kas.data || {};
  const statLoading = !stat;

  return (
    <div className="page">
      <section className="greet">
        <div className="t">
          <div className="hello"><span>{salam()}</span><span aria-hidden="true">·</span><span>{tanggal(new Date(), { hari: true })}</span></div>
          <h1>{warga?.nama}</h1>
          <span className="role">
            <ShieldCheck size={14} />{peranLabel}{warga?.blok ? ` · Blok ${warga.blok} No. ${warga.no_rumah}` : ''}
          </span>
        </div>
        <div className="side">
          {d.weather.data && (
            <div className="weather only-desktop">
              <IkonCuaca kode={d.weather.data.kode} />
              <div><b>{d.weather.data.suhu}°C</b><span>{labelCuaca(d.weather.data.kode)}</span></div>
            </div>
          )}
          {hak.pengurus && <Button variant="accent" to="/admin">Ringkasan pengurus</Button>}
        </div>
        <Roofline />
      </section>

      <nav className="card shortcuts only-mobile" style={{ padding: 6 }} aria-label="Pintasan">
        {PINTASAN.map(({ to, label, icon: Icon, tone }) => (
          <Link key={to} to={to} className="shortcut"><span className={`ico round ${tone}`}><Icon size={18} /></span>{label}</Link>
        ))}
      </nav>

      {hak.pengurus && (
        <section className="stack-sm" aria-labelledby="tugas-h">
          <div className="section-head">
            <h2 id="tugas-h">Perlu tindakan Anda</h2>
            <button type="button" className="link" onClick={() => { refresh(); refreshNotif(); }}>Perbarui</button>
          </div>
          <TugasGrid hak={hak} stat={stat} loading={statLoading} />
          {hak.humas && <WilayahCards wilayah={s.wilayah} />}
        </section>
      )}

      <section className="stats" aria-label="Ringkasan lingkungan">
        <Stat icon={Users} label="Warga aktif" value={angka(s.total_warga)} sub={`${angka(s.kepala_keluarga)} kepala keluarga`} loading={statLoading} to="/warga" />
        <Stat icon={House} label="Rumah dihuni" value={angka(s.rumah_dihuni)} sub={`Dari ${angka(s.total_rumah)} rumah terdata`} loading={statLoading} />
        <Stat icon={Receipt} tone="ok" label={s.periode_ipl ? `IPL ${periode(s.periode_ipl)}` : 'Partisipasi IPL'} value={`${persen}%`} meter={persen} sub={`${angka(s.ipl_lunas)} dari ${angka(totalIpl)} rumah lunas`} loading={statLoading} />
        <Stat icon={Wallet} tone="gold" label="Saldo kas" value={rupiah(s.saldo_kas)} sub="Terbuka untuk semua warga" loading={statLoading} to="/keuangan" />
      </section>

      <div className="split">
        <div className="stack">
          <Card>
            <CardHead title="Tagihan rumah saya" to="/ipl" actionLabel="Detail" />
            <KartuTagihan ipl={d.ipl} rumahId={warga?.rumah_id} />
          </Card>
          <Card>
            <CardHead title="Pengumuman terbaru" to="/pengumuman" />
            <CardBody>
              {d.pengumuman.loading && !d.pengumuman.data ? <SkeletonRows n={3} />
                : d.pengumuman.data?.length ? <div className="rows">{d.pengumuman.data.map((p) => <PengumumanRow key={p.id} p={p} />)}</div>
                  : <EmptyState compact icon={Megaphone} title="Belum ada pengumuman" />}
            </CardBody>
          </Card>
          <Card>
            <CardHead title="Agenda terdekat" to="/kegiatan" />
            <CardBody>
              {d.agenda.loading && !d.agenda.data ? <SkeletonRows n={3} />
                : d.agenda.data?.length ? <div className="rows">{d.agenda.data.map((k) => <AgendaRow key={k.id} k={k} />)}</div>
                  : <EmptyState compact icon={CalendarDays} title="Belum ada agenda" text="Kegiatan lingkungan yang dijadwalkan akan tampil di sini." />}
            </CardBody>
          </Card>
        </div>
        <div className="stack">
          <Card>
            <CardHead title="Kas paguyuban" desc={`Bulan ${periode(new Date())}`} to="/keuangan" actionLabel="Laporan" />
            <CardBody className="stack-sm">
              {d.kas.loading && !d.kas.data ? <Skeleton h={60} /> : (
                <div className="flow">
                  <div><div className="text-xs muted">Pemasukan</div><div className="v t-ok">{rupiah(kas.pemasukan_bulan)}</div></div>
                  <div><div className="text-xs muted">Pengeluaran</div><div className="v t-bad">{rupiah(kas.pengeluaran_bulan)}</div></div>
                </div>
              )}
              {kas.menunggu_jumlah > 0 && <Link to="/keuangan/persetujuan" className="link">{kas.menunggu_jumlah} pengeluaran menunggu persetujuan Ketua<ChevronRight size={14} /></Link>}
            </CardBody>
          </Card>
          <Card>
            <CardHead title="Notifikasi" to="/notifikasi" />
            <CardBody>
              {d.notif.loading && !d.notif.data ? <SkeletonRows n={3} />
                : d.notif.data?.length ? <div className="rows">{d.notif.data.map((n) => <NotifRow key={n.id} n={n} detail={false} />)}</div>
                  : <EmptyState compact icon={Bell} title="Tidak ada notifikasi" />}
            </CardBody>
          </Card>
          <Card className="only-desktop">
            <CardHead title="Kontak darurat" to="/kontak-darurat" />
            <CardBody>
              {d.kontak.data?.length ? (
                <div className="rows">
                  {d.kontak.data.slice(0, 4).map((k) => (
                    <a key={k.id} href={`tel:${k.nomor.replace(/[^\d+]/g, '')}`} className="rowi">
                      <span className="ico sm round bad"><Phone size={15} /></span>
                      <span className="rowi-main"><span className="rowi-title">{k.nama}</span><span className="rowi-sub num">{k.nomor}</span></span>
                    </a>
                  ))}
                </div>
              ) : <EmptyState compact icon={Phone} title="Belum ada kontak darurat" />}
            </CardBody>
          </Card>
          {pengaturan.alamat && (
            <p className="text-xs muted" style={{ padding: '0 4px' }}>{pengaturan.nama_lingkungan} · {pengaturan.alamat}</p>
          )}
        </div>
      </div>
    </div>
  );
}
