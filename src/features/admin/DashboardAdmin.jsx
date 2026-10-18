import { Link } from 'react-router-dom';
import { ShieldCheck, Check, Minus, Users, House, Receipt, Wallet, UserRound } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Card, CardHead, CardBody, SkeletonRows, EmptyState, Badge, Stat } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { statistikIplBulanan, aktivitasTerbaru, arusKas } from '../../services/dashboard';
import { TugasGrid, WilayahCards, AktivitasRow, Sebaran } from '../beranda/widgets';
import MenuCepat from '../beranda/MenuCepat';
import { menuCepatPengurus } from '../../components/layout/navConfig';
import { sebaranWarga, daftarWarga } from '../../services/warga';
import BarChart12 from '../beranda/IplChart';
import { PERAN_PENGURUS, MATRIKS, labelJabatan } from '../../lib/akses';
import { useSettings } from '../../context/SettingsContext';
import { rupiah, periode, angka, tanggal } from '../../lib/format';

function Sel({ v }) {
  if (v === true) return <Check size={16} className="yes" aria-label="Ya" />;
  if (v === false) return <Minus size={16} className="no" aria-label="Tidak" />;
  return <span className="part">{v}</span>;
}

export default function DashboardAdmin() {
  const { hak, jabatan, peranLabel } = useAuth();
  const { namaGang, blok, gang, alamatPendek } = useSettings();
  const { stat, refresh } = useTugas();
  const tahun = new Date().getFullYear();
  const lihatKeuangan = hak.bendahara || hak.pimpinan;
  const chart = useAsync(() => (lihatKeuangan ? statistikIplBulanan(tahun) : Promise.resolve(null)), [lihatKeuangan]);
  const arus = useAsync(() => (lihatKeuangan ? arusKas(tahun) : Promise.resolve(null)), [lihatKeuangan]);
  const akt = useAsync(() => aktivitasTerbaru(8), []);
  const sebar = useAsync(sebaranWarga, []);
  const baru = useAsync(() => daftarWarga({ urut: 'baru', limit: 6 }), []);
  const s = stat || {};
  const totalIpl = (s.ipl_lunas || 0) + (s.ipl_belum || 0);
  const persen = totalIpl ? Math.round((s.ipl_lunas / totalIpl) * 100) : 0;
  const statLoading = !stat;
  const bisaLihatWarga = hak.kelola_anggota || hak.humas;
  const barisBlok = blok.map((b) => ({
    key: b.kode,
    label: b.nama,
    sub: [`${gang.filter((g) => g.blok === b.kode).length} gang/jalan`, sebar.data?.tanpaGang[b.kode] ? `${sebar.data.tanpaGang[b.kode]} belum pilih gang` : null].filter(Boolean).join(' · '),
    value: sebar.data?.blok[b.kode] || 0,
    to: bisaLihatWarga ? `/admin/warga?blok=${b.kode}` : undefined,
  }));
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
            {jabatan.map((j) => <Badge key={j.id} tone="brand">{labelJabatan(j, namaGang)}</Badge>)}
          </div>
        </Card>

        <MenuCepat items={menuCepatPengurus(hak)} judul="Menu cepat pengurus" />

        <section className="stack-sm">
          <div className="section-head"><h2>Perlu tindakan</h2><button type="button" className="link" onClick={refresh}>Perbarui</button></div>
          <TugasGrid hak={hak} stat={stat} loading={!stat} />
          {!hak.kelola_info && !hak.bendahara && !hak.kelola_dokumen && !hak.humas && (
            <Card><EmptyState compact icon={ShieldCheck} title="Belum ada tugas khusus" text="Jabatan Anda belum memiliki kewenangan pengelolaan. Ketua dapat mengaturnya di menu Atur pengurus." /></Card>
          )}
        </section>

        {hak.humas && <section className="stack-sm"><h2>Gang / jalan yang Anda pegang</h2><WilayahCards wilayah={s.wilayah} /></section>}

        <section className="stats" aria-label="Ringkasan lingkungan">
          <Stat icon={Users} label="Warga aktif" value={angka(s.total_warga)} sub={`${angka(s.kepala_keluarga)} kepala keluarga`} loading={statLoading} to="/warga" />
          <Stat icon={House} label="Rumah dihuni" value={angka(s.rumah_dihuni)} sub={`Dari ${angka(s.total_rumah)} rumah terdata`} loading={statLoading} />
          <Stat icon={Receipt} tone="ok" label={s.periode_ipl ? `IPL ${periode(s.periode_ipl)}` : 'Partisipasi IPL'} value={`${persen}%`} meter={persen} sub={`${angka(s.ipl_lunas)} dari ${angka(totalIpl)} rumah lunas`} loading={statLoading} />
          <Stat icon={Wallet} tone="gold" label="Saldo kas" value={rupiah(s.saldo_kas)} sub="Terbuka untuk semua warga" loading={statLoading} to="/keuangan" />
        </section>

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

        <div className="grid-2">
          <Card>
            <CardHead title="Sebaran warga per blok" desc="Warga aktif di tiap blok" to={hak.kelola_anggota ? '/admin/wilayah' : undefined} actionLabel="Blok & gang" />
            <CardBody>
              {!blok.length ? <EmptyState compact icon={Users} title="Belum ada blok" /> : sebar.loading && !sebar.data ? <SkeletonRows n={4} avatar={false} /> : <Sebaran rows={barisBlok} />}
            </CardBody>
          </Card>
          <Card>
            <CardHead title="Anggota terbaru" desc="Warga yang baru bergabung" to="/warga" actionLabel="Direktori" />
            <CardBody>
              {baru.loading && !baru.data ? <SkeletonRows n={4} />
                : baru.data?.length ? (
                  <div className="rows">
                    {baru.data.map((w) => (
                      <Link key={w.id} to={`/warga/${w.id}`} className="rowi">
                        <Avatar nama={w.nama} path={w.foto_path} size={36} />
                        <span className="rowi-main"><span className="rowi-title">{w.nama}</span><span className="rowi-sub">{alamatPendek(w)}{w.bergabung_at ? ` · ${tanggal(w.bergabung_at, { pendek: true })}` : ''}</span></span>
                      </Link>
                    ))}
                  </div>
                ) : <EmptyState compact icon={UserRound} title="Belum ada anggota" />}
            </CardBody>
          </Card>
        </div>

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
