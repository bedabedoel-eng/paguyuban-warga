import { useState } from 'react';
import { House, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Loader, Modal, Select, useConfirm } from '../../components/ui';
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
  const [loading, setLoading] = useState(false);
  async function simpan() {
    if (!f.blok) return toast.error('Pilih blok');
    if (!/^[0-9A-Za-z-]{1,6}$/.test(f.nomor || '')) return toast.error('Nomor rumah tidak valid');
    setLoading(true);
    try {
      await simpanRumah({ id: f.id, blok: f.blok, nomor: f.nomor.toUpperCase(), status: f.status, tarif_ipl: f.tarif_ipl === '' || f.tarif_ipl == null ? null : Number(f.tarif_ipl), catatan: f.catatan || null });
      toast.success('Rumah disimpan'); setF(null); s.reload();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  async function hapus(r) {
    if (!(await confirm({ title: 'Hapus rumah?', text: `Rumah ${r.kode} beserta tagihannya akan dihapus.`, okLabel: 'Hapus', danger: true }))) return;
    try { await hapusRumah(r.id); toast.success('Rumah dihapus'); s.reload(); } catch (e) { toast.error(e); }
  }
  return (
    <>
      <PageHeader title="Data Rumah" actions={<Button size="sm" icon={Plus} onClick={() => setF({ blok: '', nomor: '', status: 'dihuni', tarif_ipl: '' })}>Tambah Rumah</Button>} mobileActions={<button className="icon-btn" aria-label="Tambah rumah" onClick={() => setF({ blok: '', nomor: '', status: 'dihuni', tarif_ipl: '' })}><Plus size={22} /></button>} />
      <div className="page" style={{ maxWidth: 900 }}>
        <Card>
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <EmptyState icon={House} title="Belum ada rumah" text="Rumah dibuat otomatis saat anggota disetujui, atau tambahkan manual." /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Rumah</th><th>Status</th><th>Tarif IPL</th><th /></tr></thead>
              <tbody>{s.data.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.kode}</b></td>
                  <td><Badge tone={r.status === 'dihuni' ? 'green' : ''}>{r.status === 'dihuni' ? 'Dihuni' : 'Kosong'}</Badge></td>
                  <td>{r.tarif_ipl != null ? rupiah(r.tarif_ipl) : <span className="muted">Standar ({rupiah(pengaturan.tarif_ipl)})</span>}</td>
                  <td className="nowrap"><button className="icon-btn" onClick={() => setF({ ...r, tarif_ipl: r.tarif_ipl ?? '' })} aria-label="Ubah"><Pencil size={16} /></button><button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => hapus(r)} aria-label="Hapus"><Trash2 size={16} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Ubah Rumah' : 'Tambah Rumah'} footer={<><Button variant="outline" onClick={() => setF(null)}>Batal</Button><Button loading={loading} onClick={simpan}>Simpan</Button></>}>
        {f && <div className="stack">
          <div className="form-grid">
            <Select label="Blok" value={f.blok} onChange={(e) => setF({ ...f, blok: e.target.value })} placeholder="Pilih blok" options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
            <Input label="Nomor" value={f.nomor} onChange={(e) => setF({ ...f, nomor: e.target.value })} maxLength={6} />
          </div>
          <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: 'dihuni', label: 'Dihuni (ditagih IPL)' }, { value: 'kosong', label: 'Kosong (tidak ditagih)' }]} />
          <Input label="Tarif IPL khusus (opsional)" type="number" min="0" value={f.tarif_ipl} onChange={(e) => setF({ ...f, tarif_ipl: e.target.value })} hint="Kosongkan untuk memakai tarif standar" />
        </div>}
      </Modal>
    </>
  );
}
