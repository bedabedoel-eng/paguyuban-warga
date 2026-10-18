import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import { Button, Input, PhoneInput, PasswordInput, Select, Alert, Modal } from '../../components/ui';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';
import { daftar } from '../../services/auth';
import { normalizeHp } from '../../lib/phone';
import { pesanError } from '../../lib/errors';
import { useSettings } from '../../context/SettingsContext';
import Syarat from './Syarat';

export function validasiDaftar(f, { butuhSandi = true } = {}) {
  const e = {};
  if (f.nama.trim().length < 2) e.nama = 'Nama lengkap minimal 2 huruf';
  else if (!/^[\p{L} .,'-]+$/u.test(f.nama.trim())) e.nama = 'Nama hanya boleh berisi huruf';
  if (!normalizeHp(f.hp)) e.hp = 'Nomor HP tidak valid (contoh 81234567890)';
  if (!f.blok) e.blok = 'Pilih blok';
  if (!/^[0-9A-Za-z-]{1,6}$/.test(f.noRumah.trim())) e.noRumah = 'Isi nomor rumah';
  if (butuhSandi) {
    if (f.password.length < 8) e.password = 'Minimal 8 karakter';
    else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Gunakan kombinasi huruf dan angka';
    if (f.konfirmasi !== f.password) e.konfirmasi = 'Konfirmasi tidak sama';
  }
  return e;
}

export default function Daftar() {
  const nav = useNavigate();
  const { blok } = useSettings();
  const [f, setF] = useState({ nama: '', hp: '', blok: '', noRumah: '', password: '', konfirmasi: '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [syarat, setSyarat] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const er = validasiDaftar(f);
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await daftar(f);
      nav('/menunggu', { replace: true });
    } catch (e2) {
      setErr(pesanError(e2));
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout compactBrand>
      <form onSubmit={submit} className="stack" noValidate>
        <div>
          <h1 className="auth-title green">Daftar Anggota</h1>
          <p className="auth-sub">Buat akun untuk bergabung dengan paguyuban. Akun aktif setelah disetujui pengurus.</p>
        </div>
        {err && <Alert tone="error" icon={CircleAlert}>{err}</Alert>}
        <Input placeholder="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} autoComplete="name" maxLength={80} />
        <PhoneInput placeholder="Nomor HP" value={f.hp} onChange={set('hp')} error={errors.hp} />
        <div>
          <div className="label mb-2">Blok / No. Rumah</div>
          <div className="form-grid">
            <Select placeholder="Pilih blok" value={f.blok} onChange={set('blok')} error={errors.blok} options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
            <Input placeholder="No. rumah" value={f.noRumah} onChange={set('noRumah')} error={errors.noRumah} maxLength={6} />
          </div>
        </div>
        <PasswordInput placeholder="Kata sandi" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="Minimal 8 karakter, kombinasi huruf dan angka" />
        <PasswordInput placeholder="Konfirmasi kata sandi" value={f.konfirmasi} onChange={set('konfirmasi')} error={errors.konfirmasi} autoComplete="new-password" />
        <Button type="submit" block loading={loading}>Daftar</Button>
        <GoogleButton label="Daftar dengan Google" />
        <p className="auth-foot small">
          Dengan mendaftar, Anda menyetujui<br />
          <button type="button" className="link-sm bold" onClick={() => setSyarat(true)}>Syarat & Ketentuan</button>
        </p>
        <p className="auth-foot">Sudah punya akun? <Link to="/masuk" className="bold">Masuk</Link></p>
      </form>
      <Modal open={syarat} onClose={() => setSyarat(false)} title="Syarat & Ketentuan"><Syarat /></Modal>
    </AuthLayout>
  );
}
