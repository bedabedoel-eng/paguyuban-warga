import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Loader, Modal, PillTabs, Select, StorageImage, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { semuaLaporan, tanggapiLaporan } from '../../services/laporan';
import { KATEGORI_LAPORAN, STATUS_LAPORAN } from '../../lib/constants';
import { tanggalJam } from '../../lib/format';

export default function KelolaLaporan() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const s = useAsync(() => semuaLaporan({ status }), [status]);
  const [sel, setSel] = useState(null);
  const [st, setSt] = useState('diproses');
  const [tg, setTg] = useState('');
  const [busy, setBusy] = useState(false);
  const buka = (l) => { setSel(l); setSt(l.status === 'baru' ? 'diproses' : l.status); setTg(l.tanggapan || ''); };
  async function simpan() {
    setBusy(true);
    try { await tanggapiLaporan(sel.id, { status: st, tanggapan: tg.trim() || null }); toast.success('Laporan diperbarui'); setSel(null); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Aspirasi & Laporan" />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          <PillTabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'Semua' }, ...Object.entries(STATUS_LAPORAN).map(([value, v]) => ({ value, label: v.label }))]} />
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <Card><EmptyState icon={MessageSquareText} title="Tidak ada laporan" /></Card> : s.data.map((l) => (
            <Card pad key={l.id} className="stack sm">
              <div className="row between"><Badge tone="green">{KATEGORI_LAPORAN[l.kategori].label}</Badge><Badge tone={STATUS_LAPORAN[l.status].tone}>{STATUS_LAPORAN[l.status].label}</Badge></div>
              <h3>{l.judul}</h3>
              <p className="small text-2" style={{ whiteSpace: 'pre-wrap' }}>{l.deskripsi}</p>
              {l.foto_path && <div className="thumb" style={{ width: 140, height: 94 }}><StorageImage path={l.foto_path} /></div>}
              {l.tanggapan && <div className="alert info"><div><b>Tanggapan:</b> {l.tanggapan}</div></div>}
              <div className="row between"><span className="tiny muted">{l.pelapor?.nama} ({l.pelapor?.blok}-{l.pelapor?.no_rumah}) • {tanggalJam(l.created_at)}</span><Button size="xs" variant="outline" onClick={() => buka(l)}>Tanggapi</Button></div>
            </Card>
          ))}
        </div>
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Tanggapi laporan" footer={<><Button variant="outline" onClick={() => setSel(null)}>Batal</Button><Button loading={busy} onClick={simpan}>Simpan</Button></>}>
        <div className="stack">
          <b>{sel?.judul}</b>
          <Select label="Status" value={st} onChange={(e) => setSt(e.target.value)} options={Object.entries(STATUS_LAPORAN).map(([value, v]) => ({ value, label: v.label }))} />
          <Textarea label="Tanggapan untuk pelapor" value={tg} onChange={(e) => setTg(e.target.value)} maxLength={1000} style={{ minHeight: 90 }} />
        </div>
      </Modal>
    </>
  );
}
