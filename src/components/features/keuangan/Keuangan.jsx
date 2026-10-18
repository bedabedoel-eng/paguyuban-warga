import { useState } from 'react';
import { Plus, TrendingDown, TrendingUp, Trash2, Pencil, ChartColumn } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Loader, Modal, SegTabs, Select, Input, Textarea, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { ringkasanKas, daftarTransaksi, simpanTransaksi, hapusTransaksi } from '../../services/kas';
import { rupiah, tanggal, awalBulan, isoDate, periode } from '../../lib/format';
import { KATEGORI_KAS } from '../../lib/constants';

function FormKas({ awal, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ jenis: awal?.jenis || 'pengeluaran', kategori: awal?.kategori || '', jumlah: awal?.jumlah || '', tanggal: awal?.tanggal || isoDate(), keterangan: awal?.keterangan || '' });
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function simpan() {
    const er = {};
    if (!f.kategori) er.kategori = 'Pilih kategori';
    if (!(Number(f.jumlah) > 0)) er.jumlah = 'Jumlah harus lebih dari 0';
    if (!f.tanggal) er.tanggal = 'Pilih tanggal';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      await simpanTransaksi({ id: awal?.id, jenis: f.jenis, kategori: f.kategori, jumlah: Math.round(Number(f.jumlah)), tanggal: f.tanggal, keterangan: f.keterangan.trim() || null, ...(awal?.id ? {} : { sumber: 'manual' }) });
      toast.success('Transaksi disimpan'); onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  return (
    <Modal open onClose={onClose} title={awal ? 'Ubah Transaksi' : 'Tambah Transaksi'} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button loading={loading} onClick={simpan}>Simpan</Button></>}>
      <div className="stack">
        <SegTabs value={f.jenis} onChange={(v) => setF((s) => ({ ...s, jenis: v, kategori: '' }))} tabs={[{ value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]} />
        <Select label="Kategori" value={f.kategori} onChange={set('kategori')} error={err.kategori} placeholder="Pilih kategori" options={KATEGORI_KAS[f.jenis]} />
        <div className="form-grid">
          <Input label="Jumlah (Rp)" type="number" inputMode="numeric" min="1" value={f.jumlah} onChange={set('jumlah')} error={err.jumlah} />
          <Input label="Tanggal" type="date" value={f.tanggal} onChange={set('tanggal')} error={err.tanggal} />
        </div>
        <Textarea label="Keterangan" value={f.keterangan} onChange={set('keterangan')} maxLength={300} style={{ minHeight: 70 }} />
      </div>
    </Modal>
  );
}

export default function Keuangan() {
  const { hak } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('pemasukan');
  const [form, setForm] = useState(null);
  const bulan = awalBulan();
  const ring = useAsync(() => ringkasanKas(bulan), [bulan]);
  const trx = useAsync(() => daftarTransaksi({ jenis: tab }), [tab]);
  const refresh = () => { ring.reload(); trx.reload(); };
  const r = ring.data || {};

  async function hapus(t) {
    if (!(await confirm({ title: 'Hapus transaksi?', text: `${t.kategori} • ${rupiah(t.jumlah)}`, okLabel: 'Hapus', danger: true }))) return;
    try { await hapusTransaksi(t.id); toast.success('Transaksi dihapus'); refresh(); } catch (e) { toast.error(e); }
  }

  return (
    <>
      <PageHeader title="Keuangan" back={false} actions={hak.bendahara && <Button size="sm" icon={Plus} onClick={() => setForm({})}>Tambah Transaksi</Button>} mobileActions={hak.bendahara && <button className="icon-btn" onClick={() => setForm({})} aria-label="Tambah transaksi"><Plus size={22} /></button>} />
      <div className="page" style={{ maxWidth: 900 }}>
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'pemasukan', label: 'Pemasukan' }, { value: 'pengeluaran', label: 'Pengeluaran' }]} />
          <Card className="saldo-card" style={{ borderRadius: 14 }}>
            <div><div className="small text-2">Saldo Saat Ini</div><div className="v">{rupiah(r.saldo)}</div></div>
            <ChartColumn size={30} className="green" />
          </Card>
          <div>
            <h2 className="mb-2" style={{ fontSize: 14 }}>Ringkasan Bulan Ini <span className="muted small">({periode(bulan)})</span></h2>
            <div className="sum2">
              <div className="in"><div className="small text-2">Pemasukan</div><div className="v green">{rupiah(r.pemasukan_bulan)}</div></div>
              <div className="out"><div className="small text-2">Pengeluaran</div><div className="v red">{rupiah(r.pengeluaran_bulan)}</div></div>
            </div>
          </div>
          <Card pad>
            <div className="section-title"><h2>Transaksi Terbaru</h2></div>
            {trx.loading && !trx.data ? <Loader /> : trx.error ? <ErrorState error={trx.error} onRetry={trx.reload} /> : !trx.data?.length ? <EmptyState icon={ChartColumn} title="Belum ada transaksi" /> : (
              <div className="list">
                {trx.data.map((t) => {
                  const masuk = t.jenis === 'pemasukan';
                  return (
                    <div className="list-item" key={t.id}>
                      <span className={`icon-circle ${masuk ? 'tone-green' : 'tone-red'}`} style={{ width: 38, height: 38 }}>{masuk ? <TrendingUp size={17} /> : <TrendingDown size={17} />}</span>
                      <span className="grow">
                        <span className="title" style={{ display: 'block' }}>{t.keterangan || t.kategori}</span>
                        <span className="sub">{tanggal(t.tanggal, { pendek: true })} <Badge>{t.kategori}</Badge></span>
                      </span>
                      <span className={masuk ? 'money-in nowrap' : 'money-out nowrap'}>{masuk ? '+' : '-'}{rupiah(t.jumlah)}</span>
                      {hak.bendahara && t.sumber === 'manual' && (
                        <span className="row" style={{ gap: 0 }}>
                          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setForm(t)} aria-label="Ubah"><Pencil size={15} /></button>
                          <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--red)' }} onClick={() => hapus(t)} aria-label="Hapus"><Trash2 size={15} /></button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
      {form && <FormKas awal={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
    </>
  );
}
