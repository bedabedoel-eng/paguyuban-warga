import { Link } from 'react-router-dom';
import {
  Sun, CloudSun, Cloud, CloudRain, CalendarDays, Megaphone, Bell, Users, Receipt,
  Wallet, ShieldCheck, Sunrise, Sunset, Moon, CircleCheck, Clock, CircleAlert, ChevronRight, ChevronDown, House, MapPin,
} from 'lucide-react';
import { Card, CardHead, CardBody, Button, Stat, SkeletonRows, EmptyState, Skeleton } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useTugas } from '../../context/TugasContext';
import { useNotif } from '../../context/NotifContext';
import { useBerandaData, ringkasIpl } from './useBerandaData';
import { PengumumanRow, AgendaRow, NotifRow, TugasGrid, WilayahCards, FotoStrip } from './widgets';
import MenuCepat from './MenuCepat';
import JadwalShalat from './JadwalShalat';
import BarChart12 from './IplChart';
import { menuCepatWarga } from '../../components/layout/navConfig';
import { labelCuaca } from '../../services/dashboard';
import { rupiah, angka, tanggal, periode, salam, tanggalHijriah } from '../../lib/format';

const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function IkonSalam({ size = 16 }) {
  const h = new Date().getHours();
  if (h < 11) return <Sunrise size={size} aria-hidden="true" />;
  if (h < 15) return <Sun size={size} aria-hidden="true" />;
  if (h < 18) return <Sunset size={size} aria-hidden="true" />;
  return <Moon size={size} aria-hidden="true" />;
}

function IkonCuaca({ kode, size = 24 }) {
  if (kode == null || kode === 0) return <Sun size={size} color="#e6c67a" />;
  if (kode <= 2) return <CloudSun size={size} color="#e6c67a" />;
  if (kode <= 48) return <Cloud size={size} color="#cfe0d7" />;
  return <CloudRain size={size} color="#9cc3ff" />;
}

function KartuTagihan({ ipl, rumahId }) {
  const r = ringkasIpl(ipl.data);
  if (ipl.loading && !ipl.data) return <CardBody><SkeletonRows n={2} avatar={false} /></CardBody>;
  if (!rumahId) return <CardBody><EmptyState compact icon={House} title="Akun belum terhubung ke rumah" text="Hubungi sekretaris atau humas jalan Anda." /></CardBody>;
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
  const { pengaturan, alamat } = useSettings();
  const { stat, refresh } = useTugas();
  const { refresh: refreshNotif } = useNotif();
  const d = useBerandaData();
  const s = stat || {};
  const totalIpl = (s.ipl_lunas || 0) + (s.ipl_belum || 0);
  const persen = totalIpl ? Math.round((s.ipl_lunas / totalIpl) * 100) : 0;
  const kas = d.kas.data || {};
  const statLoading = !stat;
  const hoy = new Date();
  const hijri = tanggalHijriah(hoy);
  const iplTampak = s.ipl_terlihat !== false; // IPL hanya terlihat oleh pengurus blok masing-masing

  return (
    <div className="page">
      <div className="estate-top">
        <MapPin size={16} aria-hidden="true" />
        <span><b>{pengaturan.nama_lingkungan || pengaturan.nama_paguyuban}</b>{pengaturan.alamat && <span>{pengaturan.alamat}</span>}</span>
      </div>

      <section className="greet">
        <div className="greet-date" role="group" aria-label={`Hari ini ${tanggal(new Date(), { hari: true })}`}>
          <span className="dow">{HARI_PANJANG[hoy.getDay()]}</span>
          <b className="dd">{hoy.getDate()}</b>
          <span className="mm">{BULAN_PANJANG[hoy.getMonth()]} {hoy.getFullYear()}</span>
          {hijri && <span className="hj">{hijri}</span>}
        </div>
        <div className="t">
          <div className="hello"><IkonSalam /><span>{salam()}</span></div>
          <h1>{warga?.nama}</h1>
          <span className="role">
            <ShieldCheck size={14} />{peranLabel}{warga?.blok ? ` · ${alamat(warga)}` : ''}
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
        <div className="greet-scene" aria-hidden="true"><HouseScene variant="dark" /></div>
      </section>

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

      {/* Desktop: kolom utama (tagihan, informasi) + kolom samping (shalat, menu, kas, notifikasi).
          HP/tablet: satu kolom dengan urutan prioritas lewat CSS (order). */}
      <div className="home-grid">
        <div className="home-main">
          <Card className="h-tagihan">
            <CardHead title="Tagihan rumah saya" to="/ipl" actionLabel="Detail" />
            <KartuTagihan ipl={d.ipl} rumahId={warga?.rumah_id} />
          </Card>
          <Card className="h-info">
            <CardHead title="Pengumuman terbaru" to="/pengumuman" actionLabel="Semua" />
            <CardBody>
              {d.pengumuman.loading && !d.pengumuman.data ? <SkeletonRows n={3} />
                : d.pengumuman.data?.length ? <div className="rows">{d.pengumuman.data.map((p) => <PengumumanRow key={p.id} p={p} />)}</div>
                  : <EmptyState compact icon={Megaphone} title="Belum ada pengumuman" />}
            </CardBody>
          </Card>
          <Card className="h-agenda">
            <CardHead title="Agenda terdekat" to="/kegiatan" actionLabel="Semua" />
            <CardBody>
              {d.agenda.loading && !d.agenda.data ? <SkeletonRows n={3} />
                : d.agenda.data?.length ? <div className="rows">{d.agenda.data.map((k) => <AgendaRow key={k.id} k={k} />)}</div>
                  : <EmptyState compact icon={CalendarDays} title="Belum ada agenda" text="Kegiatan lingkungan yang dijadwalkan akan tampil di sini." />}
            </CardBody>
          </Card>
        </div>

        <div className="home-side">
          <div className="h-shalat"><JadwalShalat lat={pengaturan.latitude} lon={pengaturan.longitude} admin={hak.admin} /></div>
          <div className="h-menu"><MenuCepat items={menuCepatWarga(hak)} /></div>
          <Card className="h-kas">
            <CardHead title="Kas paguyuban" desc={`Bulan ${periode(new Date())}`} to="/keuangan" actionLabel="Laporan" />
            <CardBody className="stack-sm">
              {d.kas.loading && !d.kas.data ? <Skeleton h={60} /> : (
                <>
                  <div><div className="text-xs muted">Saldo kas</div><div className="kas-saldo">{rupiah(s.saldo_kas)}</div></div>
                  <div className="flow">
                    <div><div className="text-xs muted">Pemasukan</div><div className="v t-ok">{rupiah(kas.pemasukan_bulan)}</div></div>
                    <div><div className="text-xs muted">Pengeluaran</div><div className="v t-bad">{rupiah(kas.pengeluaran_bulan)}</div></div>
                  </div>
                </>
              )}
              {kas.menunggu_jumlah > 0 && <Link to="/keuangan/persetujuan" className="link">{kas.menunggu_jumlah} pengeluaran menunggu persetujuan Ketua<ChevronRight size={14} /></Link>}
            </CardBody>
          </Card>
          <Card className="h-notif">
            <CardHead title="Notifikasi" to="/notifikasi" actionLabel="Semua" />
            <CardBody>
              {d.notif.loading && !d.notif.data ? <SkeletonRows n={3} />
                : d.notif.data?.length ? <div className="rows">{d.notif.data.map((n) => <NotifRow key={n.id} n={n} detail={false} />)}</div>
                  : <EmptyState compact icon={Bell} title="Tidak ada notifikasi" />}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Data pelengkap dilipat agar beranda tetap ringkas */}
      <details className="home-more">
        <summary><span>Statistik & grafik lingkungan</span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="home-more-body">
          <section className="stats" aria-label="Ringkasan lingkungan">
            <Stat icon={Users} label="Warga aktif" value={angka(s.total_warga)} sub={`${angka(s.kepala_keluarga)} kepala keluarga`} loading={statLoading} to="/warga" />
            <Stat icon={House} label="Rumah dihuni" value={angka(s.rumah_dihuni)} sub={`Dari ${angka(s.total_rumah)} rumah terdata`} loading={statLoading} />
            {iplTampak && <Stat icon={Receipt} tone="ok" label={s.periode_ipl ? `IPL ${periode(s.periode_ipl)}` : 'Partisipasi IPL'} value={`${persen}%`} meter={persen} sub={`${angka(s.ipl_lunas)} dari ${angka(totalIpl)} rumah lunas`} loading={statLoading} />}
            <Stat icon={Wallet} tone="gold" label="Saldo kas" value={rupiah(s.saldo_kas)} sub="Terbuka untuk semua warga" loading={statLoading} to="/keuangan" />
          </section>
          <div className="grid-2">
            {iplTampak && <Card>
              <CardHead title={`Pembayaran IPL ${d.tahun}`} desc={s.periode_ipl ? `${angka(s.ipl_lunas)} dari ${angka(totalIpl)} rumah lunas · ${periode(s.periode_ipl)}` : 'Belum ada tagihan'} />
              <CardBody>{d.grafikIpl.loading && !d.grafikIpl.data ? <SkeletonRows n={3} avatar={false} /> : <BarChart12 data={d.grafikIpl.data || []} />}</CardBody>
            </Card>}
            <Card>
              <CardHead title={`Arus kas ${d.tahun}`} desc={`Saldo ${rupiah(s.saldo_kas)}`} to="/keuangan" actionLabel="Laporan" />
              <CardBody>{d.grafikKas.loading && !d.grafikKas.data ? <SkeletonRows n={3} avatar={false} /> : <BarChart12 data={d.grafikKas.data || []} mode="kas" />}</CardBody>
            </Card>
          </div>
        </div>
      </details>

      {(d.tetangga.data?.length > 0) && (
        <section className="stack-sm" aria-labelledby="tetangga-h">
          <div className="section-head"><h2 id="tetangga-h">Kenali tetangga</h2><Link to="/warga" className="link">Direktori warga<ChevronRight size={14} /></Link></div>
          <FotoStrip rows={d.tetangga.data} />
        </section>
      )}
    </div>
  );
}
