import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button, PhoneInput, PasswordInput, Callout, Modal } from '../../components/ui';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import { masukDenganHp, keluar } from '../../services/auth';
import { normalizeHp } from '../../lib/phone';
import { pesanError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

/** Halaman masuk warga (default) dan pengurus (mode="admin"). */
export default function Login({ mode = 'warga' }) {
  const admin = mode === 'admin';
  const nav = useNavigate();
  const [hp, setHp] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [lupa, setLupa] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!normalizeHp(hp)) er.hp = 'Masukkan nomor HP yang valid, contoh 81234567890';
    if (pin.length < 6) er.pin = 'PIN terdiri dari 6 angka';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await masukDenganHp(hp, pin);
      if (admin) {
        const { data } = await supabase.rpc('hak_saya');
        if (!data?.pengurus) {
          await keluar();
          throw new Error('Akun ini tidak memiliki jabatan pengurus. Silakan masuk lewat halaman warga.');
        }
        nav('/admin', { replace: true });
      } else nav('/', { replace: true });
    } catch (e2) {
      setErr(pesanError(e2));
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-title">
        <h1>{admin ? 'Masuk pengurus' : 'Masuk'}</h1>
        <p>{admin ? 'Khusus akun yang memiliki jabatan pengurus.' : 'Gunakan nomor HP dan PIN yang Anda daftarkan.'}</p>
      </div>
      <form onSubmit={submit} className="stack" noValidate>
        {err && <Callout tone="bad">{err}</Callout>}
        <PhoneInput label="Nomor HP" placeholder="81234567890" value={hp} onChange={(e) => setHp(e.target.value)} error={errors.hp} autoFocus />
        <div className="stack-sm">
          <PasswordInput label="PIN" placeholder="6 angka" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} error={errors.pin} autoComplete="current-password" />
          <button type="button" className="link" style={{ alignSelf: 'flex-end' }} onClick={() => setLupa(true)}>Lupa PIN?</button>
        </div>
        <Button type="submit" block size="lg" icon={LogIn} loading={loading}>Masuk</Button>
        {!admin && <GoogleButton />}
      </form>
      {!admin ? (
        <p className="auth-foot">Belum punya akun? <Link to="/daftar">Daftar sebagai warga</Link></p>
      ) : (
        <p className="auth-foot"><Link to="/masuk">Kembali ke halaman masuk warga</Link></p>
      )}
      <Modal open={lupa} onClose={() => setLupa(false)} title="Lupa PIN"
        footer={<Button onClick={() => setLupa(false)}>Mengerti</Button>}>
        <div className="stack-sm ink-2">
          <p>Aplikasi ini tidak mengirim SMS atau email, jadi PIN diatur ulang oleh admin paguyuban.</p>
          <p>Hubungi admin atau sekretaris, lalu masuk dengan PIN sementara yang diberikan. Anda akan langsung diminta membuat PIN baru.</p>
        </div>
      </Modal>
    </AuthLayout>
  );
}
