import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Plus, Clock, Users } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, SegTabs, SkeletonRows } from '../../components/ui';
import Kalender from './Kalender';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarKegiatan, daftarIkut, batalIkut } from '../../services/kegiatan';
import { statusAgenda } from '../beranda/widgets';
import { isoDate, jam, tanggal, parseDate, BULAN_PENDEK } from '../../lib/format';

export function KegiatanCard({ k, uid, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const ikut = k.peserta?.some((p) => p.warga_id === uid);
  const selesai = parseDate(k.selesai) < new Date();
  const penuh = k.kuota && k.peserta?.length >= k.kuota;
  const m = parseDate(k.mulai);
  const st = statusAgenda(k);
  async function toggle() {
    setBusy(true);
    try { if (ikut) await batalIkut(k.id, uid); else await daftarIkut(k.id); toast.success(ikut ? 'Pendaftaran dibatalkan' : `Terdaftar di ${k.judul}`); onChanged?.(); }
    catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  return (
    <Card className="event">
      <span className="date-chip"><b>{m.getDate()}</b><span>{BULAN_PENDEK[m.getMonth()]}</span></span>
      <div className="t">
        <div className="row wrap" style={{ gap: 6 }}>
          {st && <Badge tone={st.tone}>{st.label}</Badge>}
          {k.blok && <Badge tone="gold">Gang {k.blok}</Badge>}
          {ikut && <Badge tone="ok" dot>Anda terdaftar</Badge>}
        </div>
        <Link to={`/kegiatan/${k.id}`} className="ttl">{k.judul}</Link>
        <div className="meta">
          <span><Clock size={14} />{jam(k.mulai)}–{jam(k.selesai)}</span>
          <span><MapPin size={14} />{k.lokasi}</span>
          {k.perlu_daftar && <span><Users size={14} />{k.peserta?.length || 0}{k.kuota ? `/${k.kuota}` : ''} peserta</span>}
        </div>
        <div className="acts">
          {k.perlu_daftar && !selesai && (
            <Button size="sm" variant={ikut ? 'secondary' : 'primary'} loading={busy} disabled={!ikut && penuh} onClick={toggle}>{ikut ? 'Batal ikut' : penuh ? 'Kuota penuh' : 'Ikut kegiatan'}</Button>
          )}
          <Button size="sm" variant="ghost" to={`/kegiatan/${k.id}`}>Detail</Button>
        </div>
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
    <div className="page">
      <PageHeader title="Kegiatan" desc="Agenda lingkungan. Daftar ikut agar panitia bisa menyiapkan keperluan."
        actions={hak.kelola_info && <Button size="sm" icon={Plus} to="/kegiatan/baru">Jadwalkan kegiatan</Button>} />
      <div className="split-l">
        <div className="stack">
          <SegTabs block value={tab} onChange={(v) => { setTab(v); setHari(null); }} tabs={[{ value: 'mendatang', label: 'Mendatang' }, { value: 'selesai', label: 'Sudah lewat' }]} />
          <Kalender bulan={bulan} onBulan={(b) => { setBulan(b); setHari(null); }} terpilih={hari} onPilih={setHari} adaKegiatan={adaSet} />
        </div>
        <div className="stack">
          {hari && <div className="row between"><h2>{tanggal(hari, { hari: true })}</h2><button type="button" className="link" onClick={() => setHari(null)}>Tampilkan semua</button></div>}
          {state.loading && !state.data ? <Card pad><SkeletonRows n={3} /></Card> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : !tampil?.length ? (
            <Card><EmptyState icon={CalendarDays} title={hari ? 'Tidak ada kegiatan di tanggal ini' : tab === 'selesai' ? 'Belum ada kegiatan yang lewat' : 'Belum ada kegiatan terjadwal'}
              action={hak.kelola_info && !hari && tab === 'mendatang' && <Button size="sm" icon={Plus} to="/kegiatan/baru">Jadwalkan kegiatan</Button>} /></Card>
          ) : tampil.map((k) => <KegiatanCard key={k.id} k={k} uid={user.id} onChanged={refresh} />)}
        </div>
      </div>
      {hak.kelola_info && <Link to="/kegiatan/baru" className="fab"><Plus size={20} />Jadwalkan</Link>}
    </div>
  );
}
