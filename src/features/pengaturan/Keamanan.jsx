import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Alert, Button, Card, PinInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahSandi, keluarSemuaPerangkat } from '../../services/auth';

export default function Keamanan() {
  const { user } = useAuth();
  const toast = useToast();
  const google = user?.app_metadata?.provider === 'google';
  const [f, setF] = useState({ lama: '', baru: '', ulang: '' });
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (!f.lama) er.lama = 'Isi PIN lama';
    if (!/^\d{6}$/.test(f.baru)) er.baru = 'PIN baru harus 6 angka';
    else if (f.baru === f.lama) er.baru = 'PIN baru harus berbeda dari PIN lama';
    if (f.ulang !== f.baru) er.ulang = 'Konfirmasi PIN tidak sama';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try { await ubahSandi(f.lama, f.baru); toast.success('PIN berhasil diubah'); setF({ lama: '', baru: '', ulang: '' }); } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }
  return (
    <>
      <PageHeader title="Keamanan" />
      <div className="page" style={{ maxWidth: 640 }}>
        <div className="page-inner">
          {google ? <Alert tone="info">Akun Anda masuk dengan Google, sehingga tidak memiliki PIN di aplikasi ini.</Alert> : (
            <Card pad>
              <form className="stack" onSubmit={simpan} noValidate>
                <h2>Ubah PIN</h2>
                <PinInput label="PIN lama" value={f.lama} onChange={set('lama')} error={err.lama} autoComplete="current-password" />
                <PinInput label="PIN baru (6 angka)" value={f.baru} onChange={set('baru')} error={err.baru} autoComplete="new-password" />
                <PinInput label="Ulangi PIN baru" value={f.ulang} onChange={set('ulang')} error={err.ulang} autoComplete="new-password" />
                <Button type="submit" loading={loading}>Simpan PIN</Button>
              </form>
            </Card>
          )}
          <Card pad className="stack sm">
            <h2>Sesi Login</h2>
            <p className="small text-2">Keluar dari semua perangkat bila Anda merasa akun digunakan orang lain.</p>
            <Button variant="danger-outline" onClick={async () => { await keluarSemuaPerangkat(); }}>Keluar dari Semua Perangkat</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
