import { useMemo, useState } from 'react';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Input, SkeletonRows, Modal, Select, DataTable, Chips, IconButton, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarRumah, simpanRumah, hapusRumah } from '../../services/rumah';
import { rupiah } from '../../lib/format';

export default function DataRumah() {
  const { blok, pengaturan } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useAsync(daftarRumah, []);
  const [f, setF] = useState(null);
  const [fb, setFb] = useState('');
  const [loading, setLoading] = useState(false);
  const rows = useMemo(() => (s.data || []).filter((r) => !fb || r.blok === fb), [s.data, fb]);
  const baru = () => setF({ blok: fb || '', nomor: '', status: 'dihuni', tarif_ipl: '' });

  async function simpan() {
    if (!f.blok) return toast.error('Pilih gang/blok');
    if (!/^[0-9A-Za-z-]{1,6}$/.test(f.nomor || '')) return toast.error('Nomor rumah tidak valid');
    setLoading(true);
    try {
      await simpanRumah({ id: f.id, blok: f.blok, nomor: f.nomor.toUpperCase(), status: f.status, tarif_ipl: f.tarif_ipl === '' || f.tarif_ipl == null ? null : Number(f.tarif_ipl), catatan: f.catatan || null });
      toast.success('Rumah disimpan'); setF(null); s.reload();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  async function hapus(r) {
    if (!(await confirm({ title: `Hapus rumah ${r.kode}?`, text: 'Semua tagihan IPL rumah ini ikut terhapus.', okLabel: 'Hapus rumah', danger: true }))) return;
    try { await hapusRumah(r.id); toast.success('Rumah dihapus'); s.reload(); } catch (e) { toast.error(e); }
  }
  const cols = [
    { key: 'kode', label: 'Rumah', render: (r) => <span className="cell-main">{r.kode}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'dihuni' ? 'ok' : ''} dot>{r.status === 'dihuni' ? 'Dihuni' : 'Kosong'}</Badge> },
    { key: 'tarif', label: 'Tarif IPL', className: 'right', render: (r) => (r.tarif_ipl != null ? <span className="money">{rupiah(r.tarif_ipl)}</span> : <span className="muted">Standar {rupiah(pengaturan.tarif_ipl)}</span>) },
    { key: 'aksi', label: '', className: 'actions', render: (r) => <><IconButton small icon={Pencil} size={16} label={`Ubah ${r.kode}`} onClick={() => setF({ ...r, tarif_ipl: r.tarif_ipl ?? '' })} /><IconButton small danger icon={Trash2} size={16} label={`Hapus ${r.kode}`} onClick={() => hapus(r)} /></> },
  ];
  const dihuni = rows.filter((r) => r.status === 'dihuni').length;

  return (
    <div className="page medium">
      <PageHeader back title="Data rumah" desc="Dasar penerbitan tagihan IPL. Rumah dibuat otomatis saat anggota disetujui."
        actions={<Button size="sm" icon={Plus} onClick={baru}>Tambah rumah</Button>}
        mobileActions={<IconButton icon={Plus} label="Tambah rumah" onClick={baru} />} />
      <Chips value={fb} onChange={setFb} tabs={[{ value: '', label: 'Semua', n: s.data?.length }, ...blok.map((b) => ({ value: b.kode, label: b.nama, n: (s.data || []).filter((r) => r.blok === b.kode).length }))]} />
      <Card className="flush">
        {s.loading && !s.data ? <div className="card-body"><SkeletonRows n={5} avatar={false} /></div> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
          <DataTable columns={cols} rows={rows} caption="Daftar rumah" empty={<EmptyState icon={Building2} title="Belum ada rumah" text="Tambahkan manual atau setujui anggota baru." />} />
        )}
        {rows.length > 0 && <div className="card-foot text-sm muted">{dihuni} dihuni · {rows.length - dihuni} kosong</div>}
      </Card>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? `Ubah rumah ${f.kode}` : 'Tambah rumah'}
        footer={<><Button variant="secondary" onClick={() => setF(null)}>Batal</Button><Button loading={loading} onClick={simpan}>Simpan</Button></>}>
        {f && (
          <div className="stack">
            <div className="form-grid">
              <Select label="Gang / blok" value={f.blok} onChange={(e) => setF({ ...f, blok: e.target.value })} placeholder="Pilih" options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
              <Input label="Nomor" value={f.nomor} onChange={(e) => setF({ ...f, nomor: e.target.value })} maxLength={6} />
            </div>
            <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: 'dihuni', label: 'Dihuni (ditagih IPL)' }, { value: 'kosong', label: 'Kosong (tidak ditagih)' }]} />
            <Input label="Tarif IPL khusus" optional type="number" min="0" value={f.tarif_ipl} onChange={(e) => setF({ ...f, tarif_ipl: e.target.value })} hint={`Kosongkan untuk memakai tarif standar ${rupiah(pengaturan.tarif_ipl)}`} />
          </div>
        )}
      </Modal>
    </div>
  );
}
