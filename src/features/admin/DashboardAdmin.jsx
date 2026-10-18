import { Link } from 'react-router-dom';
import {
  Megaphone, CalendarPlus, FilePlus2, Wallet, FolderPlus, UserCheck, Network, ShieldCheck, Check, Minus, ChevronRight,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Card, CardHead, CardBody, SkeletonRows, EmptyState, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { statistikIplBulanan, aktivitasTerbaru, arusKas } from '../../services/dashboard';
import { TugasGrid, WilayahCards, AktivitasRow } from '../beranda/widgets';
import BarChart12 from '../beranda/IplChart';
import { PERAN_PENGURUS, MATRIKS } from '../../lib/akses';
import { rupiah, periode, angka } from '../../lib/format';

function aksiCepat(hak) {
  const a = [];
  if (hak.kelola_info) {
    a.push({ to: '/pengumuman/baru', icon: Megaphone, l: hak.kelola_anggota ? 'Buat pengumuman' : 'Info untuk gang' });
    a.push({ to: '/kegiatan/baru', icon: CalendarPlus, l: 'Jadwalkan kegiatan' });
  }
  if (hak.kelola_anggota || hak.humas) a.push({ to: '/admin/verifikasi', icon: UserCheck, l: 'Verifikasi pendaftar' });
  if (hak.bendahara) {
    a.push({ to: '/admin/ipl', icon: FilePlus2, l: 'Terbitkan tagihan IPL' });
    a.push({ to: '/keuangan?catat=1', icon: Wallet, l: 'Catat transaksi kas' });
  }
  if (hak.kelola_dokumen) a.push({ to: '/administrasi/baru', icon: FolderPlus, l: 'Arsipkan surat / notulen' });
  if (hak.kelola_pengurus) a.push({ to: '/pengurus/kelola', icon: Network, l: 'Atur jabatan pengurus' });
  return a;
}

function Sel({ v }) {
  if (v === true) return <Check size={16} className="yes" aria-label="Ya" />;
  if (v === false) return <Minus size={16} className="no" aria-label="Tidak" />;
  return <span className="part">{v}</span>;
}

export default function DashboardAdmin() {
  const { hak, jabatan, peranLabel } = useAuth();
  const { stat, refresh } = useTugas();
  const tahun = new Date().getFullYear();
  const lihatKeuangan = hak.bendahara || hak.pimpinan;
  const chart = useAsync(() => (lihatKeuangan ? statistikIplBulanan(tahun) : Promise.resolve(null)), [lihatKeuangan]);
  const arus = useAsync(() => (lihatKeuangan ? arusKas(tahun) : Promise.resolve(null)), [lihatKeuangan]);
  const akt = useAsync(() => aktivitasTerbaru(8), []);
  const s = stat || {};
  const aksi = aksiCepat(hak);
  const perans = [...new Set(jabatan.map((j) => j.peran).filter(Boolean))];

  return (
    <div className="page">
      <PageHeader title="Ringkasan pengurus" desc="Pekerjaan yang menunggu dan alat kerja sesuai jabatan Anda." />
        <Card pad className="stack-sm">
          <div className="row wrap">
            <span className="ico gold"><ShieldCheck size={20} /></span>
            <div className="grow">
              <div className="strong">{peranLabel}</div>
              <div className="text-sm muted">
                {perans.length ? perans.map((p) => PERAN_PENGURUS[p]?.ringkas).filter(Boolean).join('. ') : hak.admin ? 'Admin sistem: akses penuh, termasuk pengaturan & import data.' : 'Pengurus'}
              </div>
            </div>
            {jabatan.map((j) => <Badge key={j.id} tone="brand">{j.jabatan}{j.wilayah_blok ? ` · Gang ${j.wilayah_blok}` : ''}</Badge>)}
          </div>
        </Card>

        <section className="stack-sm">
          <div className="section-head"><h2>Perlu tindakan</h2><button type="button" className="link" onClick={refresh}>Perbarui</button></div>
          <TugasGrid hak={hak} stat={stat} loading={!stat} />
          {!hak.kelola_info && !hak.bendahara && !hak.kelola_dokumen && !hak.humas && (
            <Card><EmptyState compact icon={ShieldCheck} title="Belum ada tugas khusus" text="Jabatan Anda belum memiliki kewenangan pengelolaan. Ketua dapat mengaturnya di menu Atur pengurus." /></Card>
          )}
        </section>

        {hak.humas && <section className="stack-sm"><h2>Gang yang Anda pegang</h2><WilayahCards wilayah={s.wilayah} /></section>}

        {aksi.length > 0 && (
          <section className="stack-sm">
            <h2>Aksi cepat</h2>
            <div className="tasks">
              {aksi.map(({ to, icon: Icon, l }) => (
                <Link key={to} to={to} className="task"><span className="ico"><Icon size={18} /></span><span className="t"><span className="l">{l}</span></span><ChevronRight size={16} className="muted" /></Link>
              ))}
            </div>
          </section>
        )}

        {lihatKeuangan && (
          <div className="grid-2">
            <Card>
              <CardHead title={`Pembayaran IPL ${tahun}`} desc={s.periode_ipl ? `${angka(s.ipl_lunas)} dari ${angka((s.ipl_lunas || 0) + (s.ipl_belum || 0))} rumah lunas · ${periode(s.periode_ipl)}` : 'Belum ada tagihan'} to={hak.bendahara ? '/admin/ipl' : undefined} actionLabel="Kelola" />
              <CardBody>{chart.loading && !chart.data ? <SkeletonRows n={3} avatar={false} /> : <BarChart12 data={chart.data || []} />}</CardBody>
            </Card>
            <Card>
              <CardHead title={`Arus kas ${tahun}`} desc={`Saldo ${rupiah(s.saldo_kas)}`} to="/keuangan" actionLabel="Laporan" />
              <CardBody>{arus.loading && !arus.data ? <SkeletonRows n={3} avatar={false} /> : <BarChart12 data={arus.data || []} mode="kas" />}</CardBody>
            </Card>
          </div>
        )}

        <div className="split">
          <Card>
            <CardHead title="Aktivitas terbaru" desc="Catatan tindakan pengurus dan warga" />
            <CardBody>
              {akt.loading && !akt.data ? <SkeletonRows n={4} />
                : akt.data?.length ? <div className="rows">{akt.data.map((a) => <AktivitasRow key={a.id} a={a} />)}</div>
                  : <EmptyState compact title="Belum ada aktivitas" />}
            </CardBody>
          </Card>
          <Card>
            <CardHead title="Pembagian kewenangan" desc="Ditegakkan oleh database, bukan hanya tampilan" />
            <div className="table-wrap">
              <table className="table matrix">
                <thead><tr><th>Tindakan</th><th title="Ketua">Ket</th><th title="Wakil Ketua">Wak</th><th title="Sekretaris">Sek</th><th title="Bendahara">Ben</th><th title="Humas Gang">Hum</th></tr></thead>
                <tbody>
                  {MATRIKS.map((m) => (
                    <tr key={m.aksi}><td className="text-sm">{m.aksi}</td>
                      {['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas'].map((k) => <td key={k}><Sel v={m[k]} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
    </div>
  );
}
