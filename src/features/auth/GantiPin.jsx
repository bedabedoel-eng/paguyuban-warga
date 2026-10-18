import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircleAlert, ShieldCheck } from 'lucide-react';
import { Button, PasswordInput, PinInput, Alert } from '../../components/ui';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahSandi } from '../../services/auth';
import { pesanError } from '../../lib/errors';

/** Layar wajib saat pertama masuk (akun hasil import) atau setelah PIN direset admin. */
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
    if (!f.lama) er.lama = 'Isi PIN awal dari pengurus';
    if (!/^\d{6}$/.test(f.baru)) er.baru = 'PIN baru harus 6 angka';
    else if (f.baru === f.lama) er.baru = 'PIN baru harus berbeda dari PIN awal';
    if (f.ulang !== f.baru) er.ulang = 'Konfirmasi PIN tidak sama';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await ubahSandi(f.lama, f.baru);
      await refreshProfil();
      toast.success('PIN berhasil dibuat. Selamat datang!');
      nav('/', { replace: true });
    } catch (e2) { setErr(pesanError(e2)); } finally { setLoading(false); }
  }

  return (
    <AuthLayout compactBrand>
      <form onSubmit={submit} className="stack" noValidate>
        <div>
          <h1 className="auth-title green">Buat PIN Baru</h1>
          <p className="auth-sub">Demi keamanan akun, ganti PIN awal Anda dengan PIN pribadi sebelum melanjutkan.</p>
        </div>
        <Alert tone="info" icon={ShieldCheck}>Masukkan PIN awal yang diberikan pengurus, lalu buat PIN baru 6 angka yang hanya Anda yang tahu.</Alert>
        {err && <Alert tone="error" icon={CircleAlert}>{err}</Alert>}
        <PasswordInput label="PIN awal" placeholder="PIN awal" value={f.lama} onChange={set('lama')} error={errors.lama} autoComplete="current-password" autoFocus />
        <PinInput label="PIN baru" placeholder="6 angka" value={f.baru} onChange={set('baru')} error={errors.baru} autoComplete="new-password" hint="Jangan pakai tanggal lahir atau angka berurutan" />
        <PinInput label="Ulangi PIN baru" placeholder="Ulangi PIN baru" value={f.ulang} onChange={set('ulang')} error={errors.ulang} autoComplete="new-password" />
        <Button type="submit" block loading={loading}>Simpan dan Lanjutkan</Button>
        <button type="button" className="link-sm" style={{ alignSelf: 'center' }} onClick={signOut}>Keluar</button>
      </form>
    </AuthLayout>
  );
}
