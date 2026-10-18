import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardHead, CardBody, PinInput, Callout, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahSandi, keluarSemuaPerangkat } from '../../services/auth';

export default function Keamanan() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const google = user?.app_metadata?.provider === 'google';
  const [f, setF] = useState({ lama: '', baru: '', ulang: '' });
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (!f.lama) er.lama = 'Isi PIN saat ini';
    if (!/^\d{6}$/.test(f.baru)) er.baru = 'PIN baru harus 6 angka';
    else if (f.baru === f.lama) er.baru = 'PIN baru harus berbeda';
    if (f.ulang !== f.baru) er.ulang = 'Konfirmasi PIN tidak sama';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try { await ubahSandi(f.lama, f.baru); toast.success('PIN berhasil diubah'); setF({ lama: '', baru: '', ulang: '' }); } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }
  async function keluarSemua() {
    if (!(await confirm({ title: 'Keluar dari semua perangkat?', text: 'Anda dan siapa pun yang memakai akun ini di perangkat lain harus masuk ulang.', okLabel: 'Keluar dari semua', danger: true }))) return;
    await keluarSemuaPerangkat();
  }
  return (
    <div className="page narrow">
      <PageHeader back="/pengaturan" title="Keamanan" />
      {google ? <Callout tone="info">Akun Anda masuk dengan Google, sehingga tidak memakai PIN.</Callout> : (
        <Card>
          <CardHead title="Ubah PIN" desc="Gunakan 6 angka yang mudah Anda ingat tetapi sulit ditebak." />
          <CardBody>
            <form className="stack" onSubmit={simpan} noValidate>
              <PinInput label="PIN saat ini" value={f.lama} onChange={set('lama')} error={err.lama} autoComplete="current-password" />
              <div className="form-grid">
                <PinInput label="PIN baru" value={f.baru} onChange={set('baru')} error={err.baru} autoComplete="new-password" />
                <PinInput label="Ulangi PIN baru" value={f.ulang} onChange={set('ulang')} error={err.ulang} autoComplete="new-password" />
              </div>
              <div className="form-actions"><Button type="submit" icon={KeyRound} loading={loading}>Simpan PIN baru</Button></div>
            </form>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHead title="Sesi di perangkat lain" desc="Gunakan bila HP Anda hilang atau akun dipakai orang lain." />
        <CardBody><Button variant="danger-soft" icon={LogOut} onClick={keluarSemua}>Keluar dari semua perangkat</Button></CardBody>
      </Card>
    </div>
  );
}
