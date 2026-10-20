import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Eye, X, FilePlus2, Banknote, Receipt, FileCheck2, MessageCircle, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, SkeletonRows, Modal, SegTabs, StorageImage, Textarea, Select, Stat, useConfirm } from '../../components/ui';
import DataManager from '../../components/data/DataManager';
import { useToast } from '../../context/ToastContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { buatTagihan, tagihanPeriode, periodeTersedia, pembayaranMenunggu, verifikasiPembayaran, tandaiLunasTunai, tunggakanIpl } from '../../services/ipl';
import { useSettings } from '../../context/SettingsContext';
import { tautanPengingat, KOLOM_TUNGGAKAN, ringkasTunggakan } from '../../lib/tunggakan';
import { signedUrl } from '../../lib/storage';
import { awalBulan, periode, rupiah, relatif } from '../../lib/format';
import { STATUS_TAGIHAN } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { labelLingkupBlok } from '../../lib/akses';
import { Callout } from '../../components/ui';

function Menunggu({ onChanged }) {
  const toast = useToast();
  const [batas, setBatas] = useState(50);
  const s = useAsync(() => pembayaranMenunggu({ batas }), [batas]);
  const [tolak, setTolak] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(null);
  const selesai = () => { s.reload(); onChanged(); };
  async function terima(p) { setBusy(p.id); try { await verifikasiPembayaran(p.id, true); toast.success(`Pembayaran ${p.rumah?.kode} diterima dan masuk kas`); selesai(); } catch (e) { toast.error(e); } finally { setBusy(null); } }
  async function tolakIni() {
    if (alasan.trim().length < 3) return toast.error('Tuliskan alasan agar warga dapat mengirim ulang bukti yang benar');
    setBusy(tolak.id);
    try { await verifikasiPembayaran(tolak.id, false, alasan); toast.success('Bukti ditolak, warga diberi tahu'); setTolak(null); setAlasan(''); selesai(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  async function lihat(p) { const u = await signedUrl('bukti', p.bukti_path); if (u) window.open(u, '_blank', 'noopener'); else toast.error('Bukti tidak dapat dibuka'); }
  if (s.loading && !s.data) return <Card pad><SkeletonRows n={3} /></Card>;
  if (s.error) return <ErrorState error={s.error} onRetry={s.reload} />;
  if (!s.data.rows.length) return <Card><EmptyState icon={FileCheck2} title="Semua bukti sudah diperiksa" text="Bukti transfer baru dari warga akan muncul di sini." /></Card>;
  return (
    <div className="grid-2">
      {s.data.rows.map((p) => (
        <Card key={p.id} className="flush">
          <button type="button" className="thumb" style={{ width: '100%', height: 180, borderRadius: 0, border: 0, cursor: 'zoom-in' }} onClick={() => lihat(p)} aria-label="Buka bukti transfer">
            <StorageImage bucket="bukti" path={p.bukti_path} fallback={<span className="thumb-fallback"><Receipt size={28} /></span>} />
          </button>
          <CardBody className="stack-sm">
            <div className="row between"><span className="strong">{p.warga?.nama}</span><span className="money" style={{ fontSize: 'var(--fs-lg)' }}>{rupiah(p.jumlah)}</span></div>
            <div className="text-sm muted">Rumah {p.rumah?.kode} · {p.tagihan.map((t) => periode(t.periode, true)).join(', ')} · {relatif(p.created_at)}</div>
            {p.catatan && <div className="text-sm ink-2">“{p.catatan}”</div>}
            <div className="row wrap" style={{ marginTop: 4 }}>
              <Button size="sm" variant="ghost" icon={Eye} onClick={() => lihat(p)}>Perbesar</Button>
              <span className="grow" />
              <Button size="sm" variant="secondary" icon={X} onClick={() => setTolak(p)}>Tolak</Button>
              <Button size="sm" icon={Check} loading={busy === p.id} onClick={() => terima(p)}>Terima</Button>
            </div>
          </CardBody>
        </Card>
      ))}
      {s.data.total > s.data.rows.length && (
        <div className="row between wrap" style={{ gridColumn: '1 / -1' }}>
          <span className="text-sm muted">Menampilkan {s.data.rows.length} dari {s.data.total} bukti menunggu</span>
          <Button variant="secondary" loading={s.loading} onClick={() => setBatas((b) => b + 50)}>Muat lagi</Button>
        </div>
      )}
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak bukti pembayaran" desc={tolak && `${tolak.warga?.nama} · ${rupiah(tolak.jumlah)}`}
        footer={<><Button variant="secondary" onClick={() => setTolak(null)}>Batal</Button><Button variant="danger" loading={busy === tolak?.id} onClick={tolakIni}>Tolak bukti</Button></>}>
        <Textarea label="Alasan (dikirim ke warga)" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={300} style={{ minHeight: 90 }} placeholder="Contoh: nominal transfer tidak sesuai tagihan" />
      </Modal>
    </div>
  );
}

const FILTER_TAGIHAN = [{
  key: 'status', label: 'Status tagihan', chips: true,
  options: [{ value: 'belum_bayar', label: 'Belum bayar' }, { value: 'menunggu_verifikasi', label: 'Diperiksa' }, { value: 'lunas', label: 'Lunas' }],
  test: (t, v) => t.status === v,
}];
const kodeTagihan = (t) => t.rumah?.kode || '';

function Periode() {
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const per = useAsync(periodeTersedia, []);
  const pilih = params.get('periode') || awalBulan();
  const setPilih = (v) => setParams((p) => { const n = new URLSearchParams(p); n.set('periode', v); n.delete('hal'); return n; }, { replace: true });
  const s = useAsync(() => tagihanPeriode(pilih), [pilih]);
  const [busy, setBusy] = useState(null);
  const opsi = useMemo(() => [...new Set([awalBulan(), ...(per.data || [])])].sort().reverse(), [per.data]);
  const data = s.data || [];
  const n = (st) => data.filter((t) => t.status === st).length;
  const terkumpul = data.filter((t) => t.status === 'lunas').reduce((a, t) => a + t.nominal, 0);
  const total = data.reduce((a, t) => a + t.nominal, 0);

  async function buat() {
    if (!(await confirm({ title: `Terbitkan tagihan ${periode(pilih)}?`, text: 'Tagihan dibuat untuk semua rumah berstatus dihuni, dan warga menerima notifikasi. Rumah yang sudah punya tagihan periode ini dilewati.', okLabel: 'Terbitkan tagihan' }))) return;
    try { const k = await buatTagihan(pilih); toast.success(k ? `${k} tagihan diterbitkan` : 'Semua rumah sudah memiliki tagihan periode ini'); s.reload(); per.reload(); } catch (e) { toast.error(e); }
  }
  async function tunai(t) {
    if (!(await confirm({ title: 'Catat pembayaran tunai?', text: `Rumah ${t.rumah?.kode} · ${rupiah(t.nominal)} ditandai lunas dan masuk kas sebagai pemasukan.`, okLabel: 'Catat lunas' }))) return;
    setBusy(t.id);
    try { await tandaiLunasTunai(t.id); toast.success(`Rumah ${t.rumah?.kode} lunas`); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  const cols = [
    { key: 'rumah', label: 'Rumah', sort: kodeTagihan, render: (t) => <span className="cell-main">{t.rumah?.kode}</span> },
    { key: 'nominal', label: 'Nominal', className: 'right', sort: (t) => t.nominal, render: (t) => <span className="money">{rupiah(t.nominal)}</span> },
    { key: 'status', label: 'Status', sort: (t) => STATUS_TAGIHAN[t.status].label, render: (t) => <span className="row" style={{ gap: 6, justifyContent: 'inherit' }}><Badge tone={STATUS_TAGIHAN[t.status].tone} dot>{STATUS_TAGIHAN[t.status].label}</Badge>{t.metode === 'tunai' && <span className="text-xs muted">tunai</span>}</span> },
  ];
  const aksiBaris = (t) => (t.status === 'belum_bayar' ? <Button size="xs" variant="secondary" icon={Banknote} loading={busy === t.id} onClick={() => tunai(t)}>Catat tunai</Button> : null);

  return (
    <div className="stack">
      <div className="toolbar">
        <Select className="sm" value={pilih} onChange={(e) => setPilih(e.target.value)} aria-label="Periode" options={opsi.map((p) => ({ value: p, label: periode(p) }))} />
        <span className="grow" />
        <Button size="sm" icon={FilePlus2} onClick={buat}>Terbitkan tagihan {periode(pilih, true)}</Button>
      </div>
      {data.length > 0 && (
        <div className="stats">
          <Stat label="Terkumpul" value={rupiah(terkumpul)} sub={`Dari ${rupiah(total)}`} meter={total ? (terkumpul / total) * 100 : 0} />
          <Stat label="Lunas" value={n('lunas')} sub="rumah" />
          <Stat label="Diperiksa" value={n('menunggu_verifikasi')} sub="bukti menunggu" />
          <Stat label="Belum bayar" value={n('belum_bayar')} sub="rumah" />
        </div>
      )}
      <DataManager rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload}
        columns={cols} caption={`Tagihan ${periode(pilih)}`} satuan="tagihan" label={(t) => `tagihan rumah ${kodeTagihan(t)}`}
        cari={{ placeholder: 'Cari kode rumah', ambil: kodeTagihan }} filters={FILTER_TAGIHAN} defaultSort={{ key: 'rumah', dir: 'asc' }}
        aksiBaris={aksiBaris}
        ekspor={{ nama: `tagihan-ipl-${String(pilih).slice(0, 7)}`, kolom: [
          { key: 'rumah', label: 'rumah', nilai: kodeTagihan },
          { key: 'nominal', label: 'nominal' },
          { key: 'status', label: 'status', nilai: (t) => STATUS_TAGIHAN[t.status]?.label || t.status },
          { key: 'metode', label: 'metode' },
          { key: 'periode', label: 'periode', nilai: (t) => String(t.periode || '').slice(0, 7) },
        ] }}
        ringkasan={(rows) => `${rows.length} tagihan · ${rupiah(rows.reduce((a, t) => a + t.nominal, 0))}`}
        kosong={{ icon: Receipt, title: `Belum ada tagihan ${periode(pilih)}`, text: 'Tekan Terbitkan tagihan untuk membuatnya.' }} />
    </div>
  );
}

function Tunggakan() {
  const { pengaturan } = useSettings();
  const s = useAsync(tunggakanIpl, []);
  const semua = useMemo(() => s.data || [], [s.data]);
  const ring = useMemo(() => ringkasTunggakan(semua), [semua]);
  const filter = useMemo(() => [{
    key: 'blok', label: 'Blok', chips: true,
    options: Object.keys(ring.blok).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })).map((b) => ({ value: b, label: `Blok ${b}` })),
    test: (t, v) => (t.blok || '-') === v,
  }], [ring]);
  const cols = [
    { key: 'kode', label: 'Rumah', sort: (t) => t.kode, render: (t) => <span><span className="cell-main">{t.kode}</span>{t.gang_nama && <span className="text-xs muted"> · {t.gang_nama}</span>}</span> },
    { key: 'nama', label: 'Penghuni', sort: (t) => t.nama || '', render: (t) => t.nama || <span className="muted">-</span> },
    { key: 'bulan', label: 'Menunggak', className: 'right', sort: (t) => t.jumlah_bulan, render: (t) => <span>{t.jumlah_bulan} bln <span className="text-xs muted">sejak {periode(t.periode_tertua, true)}</span></span> },
    { key: 'total', label: 'Total', className: 'right', sort: (t) => Number(t.total), render: (t) => <span className="money out">{rupiah(t.total)}</span> },
  ];
  const aksiBaris = (t) => {
    const u = tautanPengingat(t, pengaturan);
    return u
      ? <Button size="xs" variant="secondary" icon={MessageCircle} href={u} target="_blank" rel="noopener noreferrer">Ingatkan</Button>
      : <span className="text-xs muted">Tanpa HP</span>;
  };

  if (s.data === null) return <Callout tone="warn">Laporan tunggakan belum aktif. Jalankan <code>supabase/09-fitur-bendahara.sql</code> di SQL Editor Supabase.</Callout>;
  return (
    <div className="stack">
      {s.data && (
        <div className="stats">
          <Stat label="Rumah menunggak" value={ring.rumah} sub="lewat jatuh tempo" />
          <Stat label="Total tunggakan" value={rupiah(ring.total)} />
          <Stat label="Blok terdampak" value={Object.keys(ring.blok).length} />
        </div>
      )}
      <DataManager rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload} rowKey="rumah_id"
        columns={cols} caption="Rumah yang menunggak IPL" satuan="rumah" label={(t) => `rumah ${t.kode}`}
        cari={{ placeholder: 'Cari rumah / nama', ambil: (t) => `${t.kode} ${t.nama || ''} ${t.gang_nama || ''}` }} filters={filter}
        aksiBaris={aksiBaris} ekspor={{ nama: 'tunggakan-ipl', kolom: KOLOM_TUNGGAKAN }}
        ringkasan={(rows) => <>{rows.length} rumah · Total <b className="money out">{rupiah(rows.reduce((a, t) => a + Number(t.total || 0), 0))}</b></>}
        kosong={{ icon: AlertTriangle, title: 'Tidak ada tunggakan', text: 'Semua tagihan yang sudah jatuh tempo telah dibayar.' }} />
      <p className="text-xs muted">Tombol Ingatkan membuka WhatsApp dengan pesan yang sudah terisi; pesan baru terkirim setelah Anda menekan kirim.</p>
    </div>
  );
}

export default function KelolaIpl() {
  const { stat, refresh } = useTugas();
  const { hak } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = ['menunggu', 'periode', 'tunggakan'].includes(params.get('tab')) ? params.get('tab') : 'menunggu';
  // Tab disimpan di URL; berpindah tab membersihkan cari/filter tab sebelumnya.
  const setTab = (v) => setParams(v === 'menunggu' ? {} : { tab: v }, { replace: true });
  return (
    <div className="page medium">
      <PageHeader back title="Kelola IPL" desc="Verifikasi bukti transfer, terbitkan tagihan bulanan, dan catat pembayaran tunai." />
      <Callout tone="info">IPL yang Anda kelola: <b>{labelLingkupBlok(hak.ipl_blok)}</b>. IPL tiap blok hanya terlihat oleh pengurus blok tersebut.</Callout>
      <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'menunggu', label: 'Bukti transfer', count: stat?.pembayaran_menunggu }, { value: 'periode', label: 'Tagihan per bulan' }, { value: 'tunggakan', label: 'Tunggakan' }]} />
      {tab === 'menunggu' ? <Menunggu onChanged={refresh} /> : tab === 'periode' ? <Periode /> : <Tunggakan />}
    </div>
  );
}
