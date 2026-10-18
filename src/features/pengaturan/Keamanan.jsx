import { useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import { Alert, Button, Card, PasswordInput } from '../../components/ui';
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
  const setPin = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (!f.lama) er.lama = 'Isi PIN lama';
    if (!/^\d{6,}$/.test(f.baru)) er.baru = 'PIN baru harus berupa angka minimal 6 digit';
    if (f.ulang !== f.baru) er.ulang = 'Konfirmasi PIN tidak sama';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      await ubahSandi(f.lama, f.baru);
      toast.success('PIN berhasil diubah');
      setF({ lama: '', baru: '', ulang: '' });
    } catch (e2) {
      toast.error(e2);
    } finally {
      setLoading(false);
    }
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
                <PasswordInput
                  label="PIN lama"
                  value={f.lama}
                  onChange={setPin('lama')}
                  error={err.lama}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="current-password"
                />
                <PasswordInput
                  label="PIN baru (minimal 6 angka)"
                  value={f.baru}
                  onChange={setPin('baru')}
                  error={err.baru}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="new-password"
                  hint="Gunakan minimal 6 digit angka"
                />
                <PasswordInput
                  label="Konfirmasi PIN baru"
                  value={f.ulang}
                  onChange={setPin('ulang')}
                  error={err.ulang}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="new-password"
                />
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
