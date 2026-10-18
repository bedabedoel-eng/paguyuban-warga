import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, PhoneInput, PasswordInput, Alert, Modal } from '../../components/ui';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import { masukDenganHp, keluar } from '../../services/auth';
import { normalizeHp } from '../../lib/phone';
import { pesanError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { CircleAlert } from 'lucide-react';

/** Halaman masuk warga (mode default) dan admin (mode="admin"). */
export default function Login({ mode = 'warga' }) {
  const admin = mode === 'admin';
  const nav = useNavigate();
  const [hp, setHp] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [lupa, setLupa] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!normalizeHp(hp)) er.hp = 'Masukkan nomor HP yang valid, contoh 81234567890';
    if (!/^\d{6,}$/.test(password)) er.password = 'PIN harus berupa angka minimal 6 digit';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await masukDenganHp(hp, password);
      if (admin) {
        const { data } = await supabase.rpc('hak_saya');
        if (!data?.pengurus) {
          await keluar();
          throw new Error('Akun ini bukan pengurus atau admin. Silakan masuk lewat halaman warga.');
        }
        nav('/admin', { replace: true });
      } else {
        nav('/', { replace: true });
      }
    } catch (e2) {
      setErr(pesanError(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout compactBrand={admin}>
      <form onSubmit={submit} className="stack" noValidate>
        <div>
          <h1 className="auth-title">{admin ? 'Masuk Admin' : 'Masuk ke Akun Anda'}</h1>
          <p className="auth-sub">{admin ? 'Gunakan akun yang telah diberikan' : 'Gunakan nomor HP dan PIN untuk melanjutkan'}</p>
        </div>
        {err && <Alert tone="error" icon={CircleAlert}>{err}</Alert>}
        <PhoneInput label={admin ? 'Nomor HP' : undefined} placeholder="Nomor HP" value={hp} onChange={(e) => setHp(e.target.value)} error={errors.hp} autoFocus />
        <PasswordInput
          label={admin ? 'PIN' : undefined}
          placeholder="PIN (minimal 6 angka)"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
          error={errors.password}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={12}
          autoComplete="current-password"
        />
        <Button type="submit" block loading={loading}>{admin ? 'Masuk' : 'Masuk'}</Button>
        <button type="button" className="link-sm center" style={{ alignSelf: 'center' }} onClick={() => setLupa(true)}>Lupa PIN?</button>
        {!admin && <GoogleButton />}
        {!admin ? (
          <p className="auth-foot">Belum punya akun? <Link to="/daftar" className="bold">Daftar di sini</Link></p>
        ) : (
          <p className="auth-foot"><Link to="/masuk">Masuk sebagai warga</Link></p>
        )}
      </form>
      <Modal open={lupa} onClose={() => setLupa(false)} title="Lupa PIN">
        <p className="text-2">Demi keamanan, aplikasi ini tidak mengirim SMS atau email. Hubungi <b>admin paguyuban</b> untuk mengatur ulang PIN Anda. Setelah itu, masuk dengan PIN sementara dan segera ganti di menu Pengaturan &gt; Keamanan.</p>
      </Modal>
    </AuthLayout>
  );
}
