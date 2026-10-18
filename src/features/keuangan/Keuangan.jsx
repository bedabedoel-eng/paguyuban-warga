import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, TrendingDown, TrendingUp, Trash2, Pencil, Wallet, Check, X, BadgeCheck, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, CardHead, CardBody, EmptyState, ErrorState, SkeletonRows, Modal, LineTabs, SegTabs, Select, Input, Textarea, Chips, Callout, IconButton, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { ringkasanKas, daftarTransaksi, simpanTransaksi, hapusTransaksi, putuskanPengeluaran, arusKasBulanan } from '../../services/kas';
import BarChart12 from '../beranda/IplChart';
import { rupiah, tanggal, awalBulan, isoDate, periode, relatif } from '../../lib/format';
import { KATEGORI_KAS, STATUS_KAS } from '../../lib/constants';

function FormKas({ awal, onClose, onSaved }) {
  const toast = useToast();
  const { pengaturan } = useSettings();
  const { hak } = useAuth();
  const [f, setF] = useState({ jenis: awal?.jenis || 'pengeluaran', kategori: awal?.kategori || '', jumlah: awal?.jumlah || '', tanggal: awal?.tanggal || isoDate(), keterangan: awal?.keterangan || '' });
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const batas = Number(pengaturan.batas_persetujuan || 0);
  const perluSetuju = f.jenis === 'pengeluaran' && batas > 0 && Number(f.jumlah) >= batas && !hak.setujui_kas;
  async function simpan() {
    const er = {};
    if (!f.kategori) er.kategori = 'Pilih kategori';
    if (!(Number(f.jumlah) > 0)) er.jumlah = 'Isi jumlah lebih dari 0';
    if (!f.tanggal) er.tanggal = 'Pilih tanggal';
    if (f.jenis === 'pengeluaran' && f.keterangan.trim().length < 3) er.keterangan = 'Jelaskan untuk apa pengeluaran ini';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const row = await simpanTransaksi({ id: awal?.id, jenis: f.jenis, kategori: f.kategori, jumlah: Math.round(Number(f.jumlah)), tanggal: f.tanggal, keterangan: f.keterangan.trim() || null, ...(awal?.id ? {} : { sumber: 'manual' }) });
      toast.success(row?.status === 'menunggu' ? 'Tersimpan dan diajukan ke Ketua untuk persetujuan' : 'Transaksi dicatat');
      onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  return (
    <Modal open onClose={onClose} title={awal ? 'Ubah transaksi' : 'Catat transaksi kas'}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} onClick={simpan}>{perluSetuju ? 'Ajukan ke Ketua' : 'Simpan'}</Button></>}>
      <div className="stack">
        <SegTabs block value={f.jenis} onChange={(v) => setF((s) => ({ ...s, jenis: v, kategori: '' }))} tabs={[{ value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]} label="Jenis transaksi" />
        <div className="form-grid">
          <Select label="Kategori" value={f.kategori} onChange={set('kategori')} error={err.kategori} placeholder="Pilih" options={KATEGORI_KAS[f.jenis]} />
          <Input label="Tanggal" type="date" value={f.tanggal} onChange={set('tanggal')} error={err.tanggal} />
          <Input fieldClass="span-2" label="Jumlah (Rp)" type="number" inputMode="numeric" min="1" value={f.jumlah} onChange={set('jumlah')} error={err.jumlah} hint={Number(f.jumlah) > 0 ? rupiah(f.jumlah) : undefined} />
        </div>
        <Textarea label="Keterangan" optional={f.jenis === 'pemasukan'} value={f.keterangan} onChange={set('keterangan')} error={err.keterangan} maxLength={300} style={{ minHeight: 80 }} placeholder={f.jenis === 'pengeluaran' ? 'Contoh: Pengecatan gapura, 3 kaleng cat + upah' : 'Contoh: Donasi keluarga Bpk. Ahmad'} />
        {perluSetuju && <Callout tone="warn">Pengeluaran mulai {rupiah(batas)} perlu persetujuan Ketua. Saldo baru berkurang setelah disetujui.</Callout>}
      </div>
    </Modal>
  );
}

function Ringkasan({ r, ring }) {
  const tahun = new Date().getFullYear();
  const arus = useAsync(() => arusKasBulanan(tahun), [tahun]);
  return (
    <div className="split">
      <Card>
        <CardHead title={`Arus kas ${tahun}`} desc="Hanya transaksi yang sudah tercatat resmi" />
        <CardBody>{arus.loading && !arus.data ? <SkeletonRows n={3} avatar={false} /> : arus.error ? <ErrorState error={arus.error} onRetry={arus.reload} /> : <BarChart12 data={arus.data || []} mode="kas" />}</CardBody>
      </Card>
      <Card pad className="stack">
        <div className="balance">
          <span className="text-sm muted">Saldo kas saat ini</span>
          <span className="v">{ring.loading && !ring.data ? '…' : rupiah(r.saldo)}</span>
        </div>
        <div className="flow">
          <div><div className="text-xs muted">Masuk {periode(new Date(), true)}</div><div className="v t-ok">{rupiah(r.pemasukan_bulan)}</div></div>
          <div><div className="text-xs muted">Keluar {periode(new Date(), true)}</div><div className="v t-bad">{rupiah(r.pengeluaran_bulan)}</div></div>
        </div>
        {r.menunggu_jumlah > 0 && <Callout tone="warn" icon={Clock}>{r.menunggu_jumlah} pengeluaran ({rupiah(r.menunggu_nominal)}) menunggu persetujuan Ketua dan belum memengaruhi saldo.</Callout>}
        <p className="text-xs muted">Laporan ini terbuka untuk semua warga sebagai bentuk transparansi pengurus.</p>
      </Card>
    </div>
  );
}

function BarisTrx({ t, hak, onEdit, onHapus }) {
  const masuk = t.jenis === 'pemasukan';
  const st = STATUS_KAS[t.status || 'disetujui'];
  return (
    <div className="rowi trx">
      <span className={`ico sm round ${masuk ? 'ok' : 'bad'}`}>{masuk ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
      <span className="rowi-main">
        <span className="rowi-title">{t.keterangan || t.kategori}</span>
        <span className="rowi-sub">{tanggal(t.tanggal, { pendek: true })} · {t.kategori}{t.sumber === 'ipl' ? ' · otomatis dari IPL' : ''}</span>
        {t.status && t.status !== 'disetujui' && <span className="trx-status"><Badge tone={st.tone}>{st.label}</Badge>{t.alasan_tolak && <span className="text-xs muted">Alasan: {t.alasan_tolak}</span>}</span>}
      </span>
      <span className="rowi-end">
        <span className={`money ${masuk ? 'in' : 'out'}`}>{masuk ? '+' : '−'}{rupiah(t.jumlah)}</span>
        {hak.bendahara && t.sumber === 'manual' && (
          <span className="row" style={{ gap: 0 }}>
            <IconButton small icon={Pencil} size={15} label="Ubah transaksi" onClick={() => onEdit(t)} />
            <IconButton small danger icon={Trash2} size={15} label="Hapus transaksi" onClick={() => onHapus(t)} />
          </span>
        )}
      </span>
    </div>
  );
}

function Transaksi({ hak, onEdit, onHapus, reloadKey }) {
  const [jenis, setJenis] = useState('');
  const [bulan, setBulan] = useState('');
  const dari = bulan || undefined;
  const sampai = bulan ? isoDate(new Date(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)), 0)) : undefined;
  const trx = useAsync(() => daftarTransaksi({ jenis, dari, sampai }), [jenis, bulan, reloadKey]);
  const opsiBulan = useMemo(() => Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return { value: awalBulan(d), label: periode(d) }; }), []);
  const rows = trx.data || [];
  const tot = (j) => rows.filter((t) => t.jenis === j && (t.status || 'disetujui') === 'disetujui').reduce((a, t) => a + Number(t.jumlah), 0);
  return (
    <div className="stack">
      <div className="toolbar">
        <Chips value={jenis} onChange={setJenis} tabs={[{ value: '', label: 'Semua' }, { value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]} />
        <span className="grow" />
        <Select className="sm" value={bulan} onChange={(e) => setBulan(e.target.value)} placeholder="Semua bulan" options={opsiBulan} aria-label="Bulan" />
      </div>
      <Card>
        <CardBody>
          {trx.loading && !trx.data ? <SkeletonRows n={5} /> : trx.error ? <ErrorState error={trx.error} onRetry={trx.reload} /> : !rows.length ? <EmptyState compact icon={Wallet} title="Belum ada transaksi" text={bulan ? 'Tidak ada transaksi di bulan ini.' : undefined} /> : (
            <div className="rows">{rows.map((t) => <BarisTrx key={t.id} t={t} hak={hak} onEdit={onEdit} onHapus={onHapus} />)}</div>
          )}
        </CardBody>
        {rows.length > 0 && <div className="card-foot row wrap between text-sm"><span>Masuk <b className="money in">{rupiah(tot('pemasukan'))}</b></span><span>Keluar <b className="money out">{rupiah(tot('pengeluaran'))}</b></span></div>}
      </Card>
    </div>
  );
}

function Persetujuan({ hak, onChanged, reloadKey }) {
  const toast = useToast();
  const s = useAsync(() => daftarTransaksi({ status: 'menunggu' }), [reloadKey]);
  const riwayat = useAsync(async () => (await daftarTransaksi({ jenis: 'pengeluaran', limit: 50 })).filter((t) => t.disetujui_at && t.disetujui_oleh && t.status !== 'menunggu' && t.disetujui_oleh !== t.dibuat_oleh).slice(0, 8), [reloadKey]);
  const [tolak, setTolak] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(null);
  async function putus(t, setuju) {
    if (!setuju && alasan.trim().length < 3) return toast.error('Tuliskan alasan penolakan untuk bendahara');
    setBusy(t.id);
    try { await putuskanPengeluaran(t.id, setuju, alasan); toast.success(setuju ? 'Pengeluaran disetujui dan tercatat di kas' : 'Pengeluaran ditolak'); setTolak(null); setAlasan(''); s.reload(); riwayat.reload(); onChanged(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  return (
    <div className="stack">
      {!hak.setujui_kas && <Callout tone="info">Pengeluaran besar menunggu keputusan Ketua. Anda dapat memantau statusnya di sini.</Callout>}
      {s.loading && !s.data ? <Card pad><SkeletonRows n={2} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
        <Card><EmptyState icon={BadgeCheck} title="Tidak ada pengeluaran yang menunggu" text="Pengeluaran di atas batas yang dicatat bendahara akan muncul di sini." /></Card>
      ) : (
        <div className="grid-2">
          {s.data.map((t) => (
            <Card key={t.id} pad className="stack-sm tone-warn">
              <div className="row between"><Badge tone="warn" dot>Menunggu persetujuan</Badge><span className="text-xs muted">{relatif(t.created_at)}</span></div>
              <div className="money out" style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{rupiah(t.jumlah)}</div>
              <div className="strong">{t.keterangan || t.kategori}</div>
              <div className="text-sm muted">{t.kategori} · {tanggal(t.tanggal)} · diajukan {t.pencatat?.nama || 'bendahara'}</div>
              {hak.setujui_kas && (
                <div className="row wrap end" style={{ marginTop: 6 }}>
                  <Button size="sm" variant="secondary" icon={X} onClick={() => { setAlasan(''); setTolak(t); }}>Tolak</Button>
                  <Button size="sm" icon={Check} loading={busy === t.id} onClick={() => putus(t, true)}>Setujui</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {riwayat.data?.length > 0 && (
        <Card>
          <CardHead title="Keputusan terakhir" />
          <CardBody>
            <div className="rows">
              {riwayat.data.map((t) => (
                <div className="rowi" key={t.id}>
                  <span className={`ico sm round ${t.status === 'ditolak' ? 'bad' : 'ok'}`}>{t.status === 'ditolak' ? <X size={15} /> : <Check size={15} />}</span>
                  <span className="rowi-main"><span className="rowi-title">{t.keterangan || t.kategori}</span><span className="rowi-sub">{t.status === 'ditolak' ? `Ditolak: ${t.alasan_tolak}` : `Disetujui ${t.penyetuju?.nama || ''}`} · {relatif(t.disetujui_at)}</span></span>
                  <span className="money">{rupiah(t.jumlah)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak pengeluaran" desc={tolak && `${tolak.keterangan || tolak.kategori} · ${rupiah(tolak.jumlah)}`}
        footer={<><Button variant="secondary" onClick={() => setTolak(null)}>Batal</Button><Button variant="danger" loading={busy === tolak?.id} onClick={() => putus(tolak, false)}>Tolak pengeluaran</Button></>}>
        <Textarea label="Alasan untuk bendahara" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={300} style={{ minHeight: 90 }} placeholder="Contoh: Minta perbandingan harga dari dua toko" />
      </Modal>
    </div>
  );
}

export default function Keuangan() {
  const { hak } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { stat, refresh } = useTugas();
  const { tab: tabParam } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const tabs = [{ value: 'ringkasan', label: 'Ringkasan' }, { value: 'transaksi', label: 'Transaksi' }];
  if (hak.lihat_kas_detail) tabs.push({ value: 'persetujuan', label: 'Persetujuan', count: stat?.pengeluaran_menunggu });
  const tab = tabs.some((t) => t.value === (tabParam || params.get('tab'))) ? (tabParam || params.get('tab')) : 'ringkasan';
  const [form, setForm] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const ring = useAsync(() => ringkasanKas(awalBulan()), [reloadKey]);
  const r = ring.data || {};
  const segarkan = () => { setReloadKey((k) => k + 1); refresh(); };

  useEffect(() => {
    if (params.get('catat') && hak.bendahara) { setForm({}); params.delete('catat'); setParams(params, { replace: true }); }
  }, [params, setParams, hak.bendahara]);

  async function hapus(t) {
    if (!(await confirm({ title: 'Hapus transaksi?', text: `${t.keterangan || t.kategori} · ${rupiah(t.jumlah)} akan dihapus dari catatan kas.`, okLabel: 'Hapus', danger: true }))) return;
    try { await hapusTransaksi(t.id); toast.success('Transaksi dihapus'); segarkan(); } catch (e) { toast.error(e); }
  }

  return (
    <div className="page">
      <PageHeader title="Kas paguyuban" desc="Pemasukan dan pengeluaran paguyuban, terbuka untuk seluruh warga."
        actions={hak.bendahara && <Button size="sm" icon={Plus} onClick={() => setForm({})}>Catat transaksi</Button>}
        mobileActions={hak.bendahara && <IconButton icon={Plus} label="Catat transaksi" onClick={() => setForm({})} />} />
      <LineTabs value={tab} onChange={(v) => nav(v === 'ringkasan' ? '/keuangan' : `/keuangan/${v}`, { replace: true })} tabs={tabs} />
      {tab === 'ringkasan' && <Ringkasan r={r} ring={ring} />}
      {tab === 'transaksi' && <Transaksi hak={hak} onEdit={setForm} onHapus={hapus} reloadKey={reloadKey} />}
      {tab === 'persetujuan' && <Persetujuan hak={hak} onChanged={segarkan} reloadKey={reloadKey} />}
      {form && <FormKas awal={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); segarkan(); }} />}
    </div>
  );
}
