import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Plus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Loader, SegTabs, StorageImage } from '../../components/ui';
import HouseScene from '../../components/illustrations/HouseScene';
import Kalender from './Kalender';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarKegiatan, daftarIkut, batalIkut } from '../../services/kegiatan';
import { isoDate, jam, tanggal, parseDate } from '../../lib/format';

export function KegiatanCard({ k, uid, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const ikut = k.peserta?.some((p) => p.warga_id === uid);
  const selesai = parseDate(k.selesai) < new Date();
  const penuh = k.kuota && k.peserta?.length >= k.kuota;
  async function toggle() {
    setBusy(true);
    try { if (ikut) await batalIkut(k.id, uid); else await daftarIkut(k.id); toast.success(ikut ? 'Pendaftaran dibatalkan' : 'Berhasil mendaftar'); onChanged?.(); }
    catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  return (
    <Card className="event-card">
      <div className="top">
        <span className="thumb" style={{ width: 64, height: 64 }}>{k.gambar_path ? <StorageImage path={k.gambar_path} fallback={<HouseScene variant="day" wave={false} />} /> : <HouseScene variant="day" wave={false} />}</span>
        <div className="grow">
          <Link to={`/kegiatan/${k.id}`} className="title" style={{ fontSize: 14, fontWeight: 600, color: 'inherit', display: 'block' }}>{k.judul}</Link>
          <div className="sub row" style={{ marginTop: 2 }}><CalendarDays size={13} />{tanggal(k.mulai, { pendek: true })} • {jam(k.mulai)} - {jam(k.selesai)}</div>
          <div className="sub row"><MapPin size={13} />{k.lokasi}</div>
        </div>
        {ikut && <Badge tone="green">Terdaftar</Badge>}
      </div>
      <div className="actions">
        {k.perlu_daftar && !selesai ? (
          <Button size="sm" variant={ikut ? 'outline' : 'primary'} loading={busy} disabled={!ikut && penuh} onClick={toggle}>{ikut ? 'Batal Ikut' : penuh ? 'Kuota Penuh' : 'Daftar'}</Button>
        ) : <Button size="sm" variant="outline" disabled>{selesai ? 'Selesai' : 'Tanpa Pendaftaran'}</Button>}
        <Button size="sm" variant="outline" to={`/kegiatan/${k.id}`}>Detail</Button>
      </div>
    </Card>
  );
}

export default function Kegiatan() {
  const { hak, user } = useAuth();
  const [tab, setTab] = useState('mendatang');
  const [bulan, setBulan] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [hari, setHari] = useState(null);
  const dari = new Date(bulan.getFullYear(), bulan.getMonth(), 1).toISOString();
  const sampai = new Date(bulan.getFullYear(), bulan.getMonth() + 1, 1).toISOString();
  const bln = useAsync(() => daftarKegiatan({ dari, sampai }), [dari, sampai]);
  const list = useAsync(() => daftarKegiatan({ selesai: tab === 'selesai' }), [tab]);
  const adaSet = useMemo(() => new Set((bln.data || []).map((k) => isoDate(parseDate(k.mulai)))), [bln.data]);
  const tampil = hari ? (bln.data || []).filter((k) => isoDate(parseDate(k.mulai)) === hari) : list.data;
  const state = hari ? bln : list;
  const refresh = () => { bln.reload(); list.reload(); };
  return (
    <>
      <PageHeader title="Kegiatan" back={false} actions={hak.pengurus && <Button size="sm" icon={Plus} to="/kegiatan/baru">Buat Kegiatan</Button>} mobileActions={null} />
      <div className="page">
        <div className="kegiatan-layout page-inner" style={{ gap: 14 }}>
          <div className="stack">
            <SegTabs value={tab} onChange={(v) => { setTab(v); setHari(null); }} tabs={[{ value: 'mendatang', label: 'Mendatang' }, { value: 'selesai', label: 'Selesai' }]} />
            <Kalender bulan={bulan} onBulan={(b) => { setBulan(b); setHari(null); }} terpilih={hari} onPilih={setHari} adaKegiatan={adaSet} />
          </div>
          <div className="stack">
            {hari && <div className="row between"><b>{tanggal(hari, { hari: true })}</b><button className="link-sm" onClick={() => setHari(null)}>Tampilkan semua</button></div>}
            {state.loading && !state.data ? <Loader /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : !tampil?.length ? (
              <Card><EmptyState icon={CalendarDays} title={hari ? 'Tidak ada kegiatan di tanggal ini' : tab === 'selesai' ? 'Belum ada kegiatan selesai' : 'Belum ada kegiatan mendatang'} /></Card>
            ) : tampil.map((k) => <KegiatanCard key={k.id} k={k} uid={user.id} onChanged={refresh} />)}
          </div>
        </div>
      </div>
      {hak.pengurus && <Link to="/kegiatan/baru" className="fab" aria-label="Buat kegiatan"><Plus size={26} /></Link>}
    </>
  );
}
