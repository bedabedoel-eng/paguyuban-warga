import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, PasswordInput, PinInput, Callout } from '../../components/ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahSandi } from '../../services/auth';
import { pesanError } from '../../lib/errors';

/** Wajib saat pertama masuk (akun hasil import) atau setelah PIN direset admin. */
export default function GantiPin() {
  const nav = useNavigate();
  const toast = useToast();
  const { warga, refreshProfil, signOut } = useAuth();
  const [f, setF] = useState({ lama: '', baru: '', ulang: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  if (warga && !warga.wajib_ganti_pin) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!f.lama) er.lama = 'Isi PIN sementara dari pengurus';
    if (!/^\d{6}$/.test(f.baru)) er.baru = 'PIN baru harus 6 angka';
    else if (f.baru === f.lama) er.baru = 'PIN baru harus berbeda dari PIN sementara';
    if (f.ulang !== f.baru) er.ulang = 'Konfirmasi PIN tidak sama';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await ubahSandi(f.lama, f.baru);
      await refreshProfil();
      toast.success('PIN baru tersimpan. Selamat datang!');
      nav('/', { replace: true });
    } catch (e2) { setErr(pesanError(e2)); } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-title">
        <h1>Buat PIN pribadi</h1>
        <p>Ganti PIN sementara dari pengurus dengan PIN yang hanya Anda ketahui.</p>
      </div>
      <form onSubmit={submit} className="stack" noValidate>
        {err && <Callout tone="bad">{err}</Callout>}
        <PasswordInput label="PIN sementara" placeholder="Dari pengurus" inputMode="numeric" value={f.lama} onChange={set('lama')} error={errors.lama} autoComplete="current-password" autoFocus />
        <PinInput label="PIN baru" placeholder="6 angka" value={f.baru} onChange={set('baru')} error={errors.baru} autoComplete="new-password" hint="Jangan pakai tanggal lahir atau angka berurutan" />
        <PinInput label="Ulangi PIN baru" placeholder="6 angka" value={f.ulang} onChange={set('ulang')} error={errors.ulang} autoComplete="new-password" />
        <Button type="submit" block size="lg" loading={loading}>Simpan PIN</Button>
      </form>
      <p className="auth-foot"><button type="button" className="link" onClick={signOut}>Keluar</button></p>
    </AuthLayout>
  );
}
