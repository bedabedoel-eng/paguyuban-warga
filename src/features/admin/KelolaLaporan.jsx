import { useState } from 'react';
import { Inbox, MessageSquareReply } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import DaftarKartu from '../../components/data/DaftarKartu';
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Modal, StorageImage, Textarea, Callout, ChoiceGroup } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { semuaLaporan, tanggapiLaporan } from '../../services/laporan';
import { KATEGORI_LAPORAN, STATUS_LAPORAN } from '../../lib/constants';
import { relatif } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { namaWilayah } from '../../lib/akses';

const AKTIF = ['baru', 'diproses'];
const CARI = { placeholder: 'Cari judul, isi, atau nama pelapor', ambil: (l) => `${l.judul} ${l.deskripsi || ''} ${l.pelapor?.nama || ''}` };
const FILTER = [{
  key: 'status', label: 'Status', chips: true, semuaLabel: 'Semua',
  options: [
    { value: 'aktif', label: 'Perlu ditangani' }, { value: 'baru', label: 'Baru' }, { value: 'diproses', label: 'Diproses' },
    { value: 'selesai', label: 'Selesai' }, { value: 'ditolak', label: 'Tidak ditindaklanjuti' },
  ],
  test: (l, v) => (v === 'aktif' ? AKTIF.includes(l.status) : l.status === v),
}];
const URUTAN = [
  { key: 'baru', label: 'Terbaru', sort: (l) => l.created_at, dir: 'desc' },
  { key: 'lama', label: 'Terlama', sort: (l) => l.created_at, dir: 'asc' },
  { key: 'kategori', label: 'Jenis aspirasi', sort: (l) => `${KATEGORI_LAPORAN[l.kategori]?.label || ''} ${l.created_at}`, dir: 'asc' },
  { key: 'pelapor', label: 'Nama pelapor', sort: (l) => l.pelapor?.nama, dir: 'asc' },
];
const BAWAAN = { status: 'aktif' };

export default function KelolaLaporan() {
  const { hak } = useAuth();
  const { gang, alamatPendek } = useSettings();
  const toast = useToast();
  const { refresh } = useTugas();
  const s = useAsync(() => semuaLaporan(), []);
  const [sel, setSel] = useState(null);
  const [st, setSt] = useState('diproses');
  const [tg, setTg] = useState('');
  const [busy, setBusy] = useState(false);
  const buka = (l) => { setSel(l); setSt(l.status === 'baru' ? 'diproses' : l.status); setTg(l.tanggapan || ''); };
  async function simpan() {
    if (['selesai', 'ditolak'].includes(st) && tg.trim().length < 3) return toast.error('Tuliskan tanggapan agar pelapor tahu hasilnya');
    setBusy(true);
    try { await tanggapiLaporan(sel.id, { status: st, tanggapan: tg.trim() || null }); toast.success('Tanggapan terkirim ke pelapor'); setSel(null); s.reload(); refresh(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  return (
    <div className="page medium">
      <PageHeader back title="Aspirasi masuk" desc={hak.pimpinan ? 'Laporan dan usulan dari seluruh warga.' : `Laporan dari warga ${namaWilayah(hak, gang)}.`} />
      <DaftarKartu rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload} satuan="aspirasi" bungkus="kartu"
        cari={CARI} filters={FILTER} filterBawaan={BAWAAN} urutan={URUTAN} defaultUrutan="baru"
        kosongFilter={(d) => <Card><EmptyState icon={Inbox} title={d.filter.status === 'aktif' && !d.q ? 'Tidak ada aspirasi yang menunggu' : 'Tidak ada aspirasi yang cocok'} text="Aspirasi baru dari warga akan muncul di sini dan Anda menerima notifikasi." /></Card>}
        kosong={<EmptyState icon={Inbox} title="Belum ada aspirasi" text="Aspirasi baru dari warga akan muncul di sini dan Anda menerima notifikasi." />}
        renderItem={(l) => {
          const K = KATEGORI_LAPORAN[l.kategori];
          return (
            <Card key={l.id}>
              <CardBody className="stack-sm">
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
                  <span className="text-sm grow">{l.pelapor?.nama} <span className="muted">· {alamatPendek(l.pelapor)} · {relatif(l.created_at)}</span></span>
                  <Button size="sm" variant={l.status === 'baru' ? 'primary' : 'secondary'} icon={MessageSquareReply} onClick={() => buka(l)}>{l.status === 'baru' ? 'Tanggapi' : 'Perbarui'}</Button>
                </div>
              </CardBody>
            </Card>
          );
        }} />
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
