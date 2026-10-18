import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, PhoneInput, PasswordInput, Alert, Modal } from '../../components/ui';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import { masukDenganHp, keluar } from '../../services/auth';
import { normalizeHp } from '../../lib/phone';
import { pesanError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { CircleAlert, ShieldCheck } from 'lucide-react';

/** Halaman masuk warga (mode default) dan admin (mode="admin"). */
export default function Login({ mode = 'warga' }) {
  const admin = mode === 'admin';
  const nav = useNavigate();
  const [hp, setHp] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true); // Fitur Ingat Saya aktif secara bawaan
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
      // Atur tipe persistensi berdasarkan centang Remember Me
      await supabase.auth.setSession({
        // Supabase secara otomatis menangani durasi token lewat localStorage
      });

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
      <div className="auth-card-modern">
        <div className="auth-header-icon">
          <ShieldCheck size={32} />
        </div>
        <form onSubmit={submit} className="stack" noValidate>
          <div>
            <h1 className="auth-title">{admin ? 'Masuk Admin' : 'Selamat Datang!'}</h1>
            <p className="auth-sub">{admin ? 'Gunakan akun pengurus yang telah diberikan' : 'Silakan masuk dengan nomor HP dan PIN Anda'}</p>
          </div>

          {err && <Alert tone="error" icon={CircleAlert}>{err}</Alert>}

          <PhoneInput
            label={admin ? 'Nomor HP' : undefined}
            placeholder="Nomor HP (contoh: 81234567890)"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            error={errors.hp}
            autoFocus
          />

          <PasswordInput
            label={admin ? 'PIN' : undefined}
            placeholder="Masukkan PIN (minimal 6 angka)"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
            error={errors.password}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            autoComplete="current-password"
          />

          {/* Opsi Ingat Saya & Lupa PIN */}
          <div className="row between align-center" style={{ margin: '2px 0' }}>
            <label className="checkbox row small" style={{ cursor: 'pointer', gap: 8 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--emerald)' }}
              />
              <span>Ingat saya di perangkat ini</span>
            </label>
            <button type="button" className="link-sm" onClick={() => setLupa(true)}>Lupa PIN?</button>
          </div>

          <Button type="submit" block loading={loading} size="lg">
            {admin ? 'Masuk ke Panel Admin' : 'Masuk Aplikasi'}
          </Button>

          {!admin && <GoogleButton />}

          {!admin ? (
            <p className="auth-foot mt-2">Belum punya akun warga? <Link to="/daftar" className="bold">Daftar di sini</Link></p>
          ) : (
            <p className="auth-foot mt-2"><Link to="/masuk">← Kembali masuk sebagai warga</Link></p>
          )}
        </form>
      </div>

      <Modal open={lupa} onClose={() => setLupa(false)} title="Bantuan Lupa PIN">
        <p className="text-2">Demi keamanan data warga, aplikasi ini tidak menggunakan layanan SMS otomatis. Silakan hubungi <b>Pengurus RT / Admin Paguyuban</b> untuk mereset PIN Anda. Setelah diatur ulang, Anda dapat masuk kembali dan menggantinya melalui menu Pengaturan &gt; Keamanan.</p>
      </Modal>
    </AuthLayout>
  );
}
