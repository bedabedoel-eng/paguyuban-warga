import { useMemo, useState } from 'react';
import { Inbox, MessageSquareReply } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, ErrorState, SkeletonRows, Modal, Chips, StorageImage, Textarea, Callout, ChoiceGroup } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { semuaLaporan, tanggapiLaporan } from '../../services/laporan';
import { KATEGORI_LAPORAN, STATUS_LAPORAN } from '../../lib/constants';
import { relatif } from '../../lib/format';

export default function KelolaLaporan() {
  const { hak } = useAuth();
  const toast = useToast();
  const { refresh } = useTugas();
  const [status, setStatus] = useState('aktif');
  const s = useAsync(() => semuaLaporan(), []);
  const [sel, setSel] = useState(null);
  const [st, setSt] = useState('diproses');
  const [tg, setTg] = useState('');
  const [busy, setBusy] = useState(false);
  const all = s.data || [];
  const n = (k) => all.filter((l) => (k === 'aktif' ? ['baru', 'diproses'].includes(l.status) : l.status === k)).length;
  const rows = useMemo(() => all.filter((l) => (status === 'aktif' ? ['baru', 'diproses'].includes(l.status) : !status || l.status === status)), [all, status]);
  const buka = (l) => { setSel(l); setSt(l.status === 'baru' ? 'diproses' : l.status); setTg(l.tanggapan || ''); };
  async function simpan() {
    if (['selesai', 'ditolak'].includes(st) && tg.trim().length < 3) return toast.error('Tuliskan tanggapan agar pelapor tahu hasilnya');
    setBusy(true);
    try { await tanggapiLaporan(sel.id, { status: st, tanggapan: tg.trim() || null }); toast.success('Tanggapan terkirim ke pelapor'); setSel(null); s.reload(); refresh(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  return (
    <div className="page medium">
      <PageHeader back title="Aspirasi masuk" desc={hak.pimpinan ? 'Laporan dan usulan dari seluruh warga.' : `Laporan dari warga Gang ${hak.wilayah.join(', ')}.`} />
      <Chips value={status} onChange={setStatus} tabs={[
        { value: 'aktif', label: 'Perlu ditangani', n: n('aktif') },
        { value: 'baru', label: 'Baru', n: n('baru') },
        { value: 'diproses', label: 'Diproses', n: n('diproses') },
        { value: 'selesai', label: 'Selesai', n: n('selesai') },
        { value: 'ditolak', label: 'Tidak ditindaklanjuti', n: n('ditolak') },
        { value: '', label: 'Semua', n: all.length },
      ]} />
      {s.loading && !s.data ? <Card pad><SkeletonRows n={4} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !rows.length ? (
        <Card><EmptyState icon={Inbox} title={status === 'aktif' ? 'Tidak ada aspirasi yang menunggu' : 'Tidak ada aspirasi'} text="Aspirasi baru dari warga akan muncul di sini dan Anda menerima notifikasi." /></Card>
      ) : rows.map((l) => {
        const K = KATEGORI_LAPORAN[l.kategori];
        return (
          <Card key={l.id}>
            <CardBody className="stack-sm" >
              <div className="row between wrap">
                <span className="row text-sm muted" style={{ gap: 6 }}><K.icon size={15} />{K.label}</span>
                <Badge tone={STATUS_LAPORAN[l.status].tone} dot>{STATUS_LAPORAN[l.status].label}</Badge>
              </div>
              <h3 style={{ fontSize: 'var(--fs-lg)' }}>{l.judul}</h3>
              <p className="ink-2 pre-wrap">{l.deskripsi}</p>
              {l.foto_path && <div className="thumb" style={{ width: 180, height: 120 }}><StorageImage path={l.foto_path} /></div>}
              {l.tanggapan && <Callout tone="neutral" icon={MessageSquareReply}><b>Tanggapan:</b> {l.tanggapan}</Callout>}
              <div className="row wrap" style={{ marginTop: 4 }}>
                <Avatar nama={l.pelapor?.nama} path={l.pelapor?.foto_path} size={28} />
                <span className="text-sm grow">{l.pelapor?.nama} <span className="muted">· {l.pelapor?.blok}-{l.pelapor?.no_rumah} · {relatif(l.created_at)}</span></span>
                <Button size="sm" variant={l.status === 'baru' ? 'primary' : 'secondary'} icon={MessageSquareReply} onClick={() => buka(l)}>{l.status === 'baru' ? 'Tanggapi' : 'Perbarui'}</Button>
              </div>
            </CardBody>
          </Card>
        );
      })}
      <Modal open={!!sel} onClose={() => setSel(null)} title="Tanggapi aspirasi" desc={sel?.judul}
        footer={<><Button variant="secondary" onClick={() => setSel(null)}>Batal</Button><Button loading={busy} onClick={simpan}>Kirim tanggapan</Button></>}>
        <div className="stack">
          <div className="field"><span className="field-label">Status</span>
            <ChoiceGroup value={st} onChange={setSt} label="Status" options={['diproses', 'selesai', 'ditolak'].map((k) => ({ value: k, label: STATUS_LAPORAN[k].label }))} />
          </div>
          <Textarea label="Tanggapan untuk pelapor" value={tg} onChange={(e) => setTg(e.target.value)} maxLength={1000} style={{ minHeight: 110 }} placeholder="Contoh: Sudah dilaporkan ke PLN, perbaikan dijadwalkan Kamis." />
        </div>
      </Modal>
    </div>
  );
}
