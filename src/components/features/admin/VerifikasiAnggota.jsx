import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Button, Card, EmptyState, ErrorState, Loader, Modal, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { wargaMenunggu, setujuiAnggota, tolakAnggota } from '../../services/warga';
import { formatHp } from '../../lib/phone';
import { relatif } from '../../lib/format';

export default function VerifikasiAnggota() {
  const toast = useToast();
  const s = useAsync(wargaMenunggu, []);
  const [tolak, setTolak] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(null);
  async function setuju(w) {
    setBusy(w.id);
    try { await setujuiAnggota(w.id, true); toast.success(`${w.nama} disetujui`); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  async function konfirmasiTolak() {
    setBusy(tolak.id);
    try { await tolakAnggota(tolak.id, alasan); toast.success('Pendaftaran ditolak'); setTolak(null); setAlasan(''); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(null); }
  }
  return (
    <>
      <PageHeader title="Verifikasi Anggota" />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="page-inner">
          {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
            <Card><EmptyState icon={UserCheck} title="Tidak ada pendaftar baru" text="Semua pendaftaran sudah diproses." /></Card>
          ) : s.data.map((w) => (
            <Card pad key={w.id} className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
              <Avatar nama={w.nama} size={48} />
              <div className="grow" style={{ minWidth: 200 }}>
                <div className="bold">{w.nama}</div>
                <div className="small text-2">Blok {w.blok || '?'} No. {w.no_rumah || '?'} • {w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : 'tanpa nomor'}</div>
                <div className="tiny muted">Mendaftar {relatif(w.created_at)}</div>
              </div>
              <div className="row">
                <Button size="sm" variant="outline" onClick={() => setTolak(w)}>Tolak</Button>
                <Button size="sm" loading={busy === w.id} onClick={() => setuju(w)}>Setujui</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak pendaftaran" footer={<><Button variant="outline" onClick={() => setTolak(null)}>Batal</Button><Button variant="danger" loading={busy === tolak?.id} onClick={konfirmasiTolak}>Tolak</Button></>}>
        <p className="text-2 mb-3">Tolak pendaftaran <b>{tolak?.nama}</b>?</p>
        <Textarea label="Alasan (ditampilkan ke pendaftar)" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={300} style={{ minHeight: 80 }} />
      </Modal>
    </>
  );
}
