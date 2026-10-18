import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button, Input, PhoneInput, PinInput, Select, Callout, Modal } from '../../components/ui';
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
  if (!f.blok) e.blok = 'Pilih gang/blok';
  if (!/^[0-9A-Za-z-]{1,6}$/.test(f.noRumah.trim())) e.noRumah = 'Isi nomor rumah';
  if (butuhSandi) {
    if (!/^\d{6}$/.test(f.password)) e.password = 'PIN harus 6 angka';
    if (f.konfirmasi !== f.password) e.konfirmasi = 'Konfirmasi PIN tidak sama';
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
    } catch (e2) { setErr(pesanError(e2)); } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-title">
        <h1>Daftar warga</h1>
        <p>Akun aktif setelah pengurus memeriksa data rumah Anda.</p>
      </div>
      <form onSubmit={submit} className="stack" noValidate>
        {err && <Callout tone="bad">{err}</Callout>}
        <Input label="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} autoComplete="name" maxLength={80} />
        <PhoneInput label="Nomor HP" placeholder="81234567890" value={f.hp} onChange={set('hp')} error={errors.hp} hint="Dipakai untuk masuk. Tidak ditampilkan ke warga lain tanpa izin Anda." />
        <div className="form-grid">
          <Select label="Gang / blok" placeholder="Pilih" value={f.blok} onChange={set('blok')} error={errors.blok} options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
          <Input label="Nomor rumah" value={f.noRumah} onChange={set('noRumah')} error={errors.noRumah} maxLength={6} />
        </div>
        <div className="form-grid">
          <PinInput label="Buat PIN" placeholder="6 angka" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
          <PinInput label="Ulangi PIN" placeholder="6 angka" value={f.konfirmasi} onChange={set('konfirmasi')} error={errors.konfirmasi} autoComplete="new-password" />
        </div>
        <p className="text-xs muted">Hindari tanggal lahir atau angka berurutan. Dengan mendaftar, Anda menyetujui <button type="button" className="link text-xs" onClick={() => setSyarat(true)}>ketentuan penggunaan data</button>.</p>
        <Button type="submit" block size="lg" icon={UserPlus} loading={loading}>Daftar</Button>
        <GoogleButton label="Daftar dengan Google" />
      </form>
      <p className="auth-foot">Sudah punya akun? <Link to="/masuk">Masuk</Link></p>
      <Modal open={syarat} onClose={() => setSyarat(false)} title="Ketentuan penggunaan data" footer={<Button onClick={() => setSyarat(false)}>Tutup</Button>}><Syarat /></Modal>
    </AuthLayout>
  );
}
