import { useState } from 'react';
import { UserCheck, Check, X, Phone, House } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Button, Card, EmptyState, ErrorState, SkeletonRows, Modal, Textarea, Callout, Checkbox, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTugas } from '../../context/TugasContext';
import { useAsync } from '../../hooks/useAsync';
import { wargaMenunggu, setujuiAnggota, tolakAnggota } from '../../services/warga';
import { formatHp } from '../../lib/phone';
import { relatif } from '../../lib/format';

export default function VerifikasiAnggota() {
  const { hak } = useAuth();
  const toast = useToast();
  const { refresh } = useTugas();
  const s = useAsync(wargaMenunggu, []);
  const [setuju, setSetuju] = useState(null);
  const [kk, setKk] = useState(true);
  const [tolak, setTolak] = useState(null);
  const [alasan, setAlasan] = useState('');
  const [busy, setBusy] = useState(false);

  async function konfirmasiSetuju() {
    setBusy(true);
    try { await setujuiAnggota(setuju.id, kk); toast.success(`${setuju.nama} sekarang anggota aktif`); setSetuju(null); s.reload(); refresh(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  async function konfirmasiTolak() {
    if (alasan.trim().length < 3) return toast.error('Tuliskan alasan agar pendaftar tahu yang perlu diperbaiki');
    setBusy(true);
    try { await tolakAnggota(tolak.id, alasan); toast.success('Pendaftaran ditolak'); setTolak(null); setAlasan(''); s.reload(); refresh(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }

  const scope = hak.kelola_anggota ? 'Semua gang' : `Gang ${hak.wilayah.join(', ')}`;
  return (
    <div className="page narrow">
      <PageHeader back title="Verifikasi anggota" desc={`Periksa nama dan alamat rumah sebelum menyetujui. Cakupan Anda: ${scope}.`} />
      {s.loading && !s.data ? <Card pad><SkeletonRows n={3} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
        <Card><EmptyState icon={UserCheck} title="Tidak ada pendaftar baru" text="Pendaftar dari wilayah Anda akan muncul di sini dan Anda akan menerima notifikasi." /></Card>
      ) : (
        <Card>
          <div className="rows inset">
            {s.data.map((w) => (
              <div className="rowi wrap" key={w.id} style={{ flexWrap: 'wrap' }}>
                <Avatar nama={w.nama} size={44} />
                <div className="rowi-main" style={{ minWidth: 200 }}>
                  <span className="rowi-title">{w.nama}</span>
                  <span className="rowi-sub row wrap" style={{ gap: '4px 12px' }}>
                    <span className="row" style={{ gap: 4 }}><House size={13} />{w.blok ? `Blok ${w.blok} No. ${w.no_rumah}` : 'Rumah belum diisi'}</span>
                    <span className="row num" style={{ gap: 4 }}><Phone size={13} />{w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : 'Tanpa nomor'}</span>
                  </span>
                  <span className="rowi-sub text-xs">Mendaftar {relatif(w.created_at)}</span>
                </div>
                <div className="rowi-end">
                  {!w.blok && <Badge tone="warn">Data belum lengkap</Badge>}
                  <Button size="sm" variant="secondary" icon={X} onClick={() => setTolak(w)}>Tolak</Button>
                  <Button size="sm" icon={Check} disabled={!w.blok} onClick={() => { setKk(true); setSetuju(w); }}>Setujui</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={!!setuju} onClose={() => setSetuju(null)} title={`Setujui ${setuju?.nama}?`} desc={setuju && `Blok ${setuju.blok} No. ${setuju.no_rumah}`}
        footer={<><Button variant="secondary" onClick={() => setSetuju(null)}>Batal</Button><Button loading={busy} icon={Check} onClick={konfirmasiSetuju}>Setujui anggota</Button></>}>
        <div className="stack">
          <Callout tone="info">Rumah akan dibuat otomatis bila belum ada, dan anggota langsung menerima tagihan IPL periode berikutnya.</Callout>
          <Checkbox checked={kk} onChange={setKk} hint="Matikan bila pendaftar adalah anggota keluarga lain di rumah yang sama.">Kepala keluarga di rumah ini</Checkbox>
        </div>
      </Modal>
      <Modal open={!!tolak} onClose={() => setTolak(null)} title="Tolak pendaftaran"
        footer={<><Button variant="secondary" onClick={() => setTolak(null)}>Batal</Button><Button variant="danger" loading={busy} onClick={konfirmasiTolak}>Tolak pendaftaran</Button></>}>
        <div className="stack">
          <p className="ink-2">Pendaftar <b>{tolak?.nama}</b> akan melihat alasan ini di aplikasi.</p>
          <Textarea label="Alasan" value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={300} style={{ minHeight: 90 }} placeholder="Contoh: nomor rumah tidak sesuai data paguyuban" />
        </div>
      </Modal>
    </div>
  );
}
