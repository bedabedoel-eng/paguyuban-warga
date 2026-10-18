import { useMemo, useState } from 'react';
import { Check, Eye, X, FilePlus2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Loader, Modal, SegTabs, StorageImage, Textarea, useConfirm } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { buatTagihan, tagihanPeriode, periodeTersedia, pembayaranMenunggu, verifikasiPembayaran, tandaiLunasTunai } from '../../services/ipl';
import { signedUrl } from '../../lib/storage';
import { awalBulan, periode, rupiah, tanggalJam } from '../../lib/format';
import { STATUS_TAGIHAN } from '../../lib/constants';

function Menunggu() {
  const toast = useToast();
  const s = useAsync(pembayaranMenunggu, []);
  const [tolak, setTolak] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(null);
  async function terima(p) { setBusy(p.id); try { await verifikasiPembayaran(p.id, true); toast.success('Pembayaran diterima & dicatat ke kas'); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); } }
  async function tolakIni() { setBusy(tolak.id); try { await verifikasiPembayaran(tolak.id, false, alasan); toast.success('Pembayaran ditolak'); setTolak(null); setAlasan(''); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); } }
  async function lihat(p) { const u = await signedUrl('bukti', p.bukti_path); if (u) window.open(u, '_blank', 'noopener'); else toast.error('Bukti tidak dapat dibuka'); }
  if (s.loading && !s.data) return <Loader />;
  if (s.error) return <ErrorState error={s.error} onRetry={s.reload} />;
  if (!s.data.length) return <Card><EmptyState icon={Check} title="Tidak ada pembayaran menunggu" /></Card>;
  return (
    <div className="stack">
      {s.data.map((p) => (
        <Card pad key={p.id} className="stack sm">
          <div className="row between"><b>{p.warga?.nama} <span className="muted small">({p.rumah?.kode})</span></b><b className="green">{rupiah(p.jumlah)}</b></div>
          <div className="small text-2">{p.tagihan.map((t) => periode(t.periode, true)).join(', ')} • {tanggalJam(p.created_at)}</div>
          {p.catatan && <div className="small">Catatan: {p.catatan}</div>}
          <div style={{ width: 160, height: 110 }} className="thumb"><StorageImage bucket="bukti" path={p.bukti_path} fallback={<Button size="xs" variant="outline" onClick={() => lihat(p)}>Buka bukti</Button>} /></div>
          <div className="row wrap">
            <Button size="sm" variant="outline" icon={Eye} onClick={() => lihat(p)}>Lihat bukti</Button>
            <span className="grow" />
            <Button size="sm" variant="danger-outline" icon={X} onClick={() => setTolak(p)}>Tolak</Button>
            <Button size="sm" icon={Check} loading={busy === p.id} onClick={() => terima(p)}>Terima</Button>
          </div>
        </Card>
      ))}
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak bukti pembayaran" footer={<><Button variant="outline" onClick={() => setTolak(null)}>Batal</Button><Button variant="danger" loading={busy === tolak?.id} onClick={tolakIni}>Tolak</Button></>}>
        <Textarea label="Alasan (dikirim ke warga)" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={300} style={{ minHeight: 80 }} placeholder="Contoh: bukti tidak terbaca / nominal tidak sesuai" />
      </Modal>
    </div>
  );
}

function Periode() {
  const toast = useToast();
  const confirm = useConfirm();
  const per = useAsync(periodeTersedia, []);
  const [pilih, setPilih] = useState(awalBulan());
  const s = useAsync(() => tagihanPeriode(pilih), [pilih]);
  const [busy, setBusy] = useState(null);
  const opsi = useMemo(() => [...new Set([awalBulan(), ...(per.data || [])])].sort().reverse(), [per.data]);
  const lunas = (s.data || []).filter((t) => t.status === 'lunas').length;
  async function buat() {
    if (!(await confirm({ title: `Terbitkan tagihan ${periode(pilih)}?`, text: 'Tagihan dibuat untuk semua rumah berstatus dihuni dan warga akan menerima notifikasi.', okLabel: 'Terbitkan' }))) return;
    try { const n = await buatTagihan(pilih); toast.success(n ? `${n} tagihan diterbitkan` : 'Semua tagihan periode ini sudah ada'); s.reload(); per.reload(); } catch (e) { toast.error(e); }
  }
  async function tunai(t) {
    if (!(await confirm({ title: 'Catat pembayaran tunai?', text: `${t.rumah?.kode} • ${rupiah(t.nominal)} akan dicatat lunas dan masuk kas.`, okLabel: 'Catat Lunas' }))) return;
    setBusy(t.id);
    try { await tandaiLunasTunai(t.id); toast.success('Tercatat lunas'); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  return (
    <div className="stack">
      <div className="row wrap">
        <select className="select sm" style={{ width: 180 }} value={pilih} onChange={(e) => setPilih(e.target.value)} aria-label="Periode">{opsi.map((p) => <option key={p} value={p}>{periode(p)}</option>)}</select>
        <span className="grow" />
        <Button size="sm" icon={FilePlus2} onClick={buat}>Terbitkan Tagihan</Button>
      </div>
      {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <Card><EmptyState title="Belum ada tagihan periode ini" text="Klik Terbitkan Tagihan untuk membuatnya." /></Card> : (
        <Card>
          <div className="card-head"><h2>{periode(pilih)}</h2><span className="small text-2">{lunas} dari {s.data.length} lunas</span></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Rumah</th><th>Nominal</th><th>Status</th><th /></tr></thead>
            <tbody>{[...s.data].sort((a, b) => a.rumah.kode.localeCompare(b.rumah.kode, 'id', { numeric: true })).map((t) => (
              <tr key={t.id}>
                <td><b>{t.rumah?.kode}</b></td><td>{rupiah(t.nominal)}</td>
                <td><Badge tone={STATUS_TAGIHAN[t.status].tone}>{STATUS_TAGIHAN[t.status].label}</Badge>{t.metode === 'tunai' && <span className="tiny muted"> tunai</span>}</td>
                <td>{t.status === 'belum_bayar' && <Button size="xs" variant="outline" loading={busy === t.id} onClick={() => tunai(t)}>Catat Tunai</Button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </div>
  );
}

export default function KelolaIpl() {
  const [tab, setTab] = useState('menunggu');
  return (
    <>
      <PageHeader title="Kelola IPL" />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'menunggu', label: 'Menunggu Verifikasi' }, { value: 'periode', label: 'Tagihan per Periode' }]} />
          {tab === 'menunggu' ? <Menunggu /> : <Periode />}
        </div>
      </div>
    </>
  );
}
