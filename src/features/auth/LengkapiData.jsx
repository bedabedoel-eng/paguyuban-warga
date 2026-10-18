import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import { Button, Input, PhoneInput, Select, Alert } from '../../components/ui';
import AuthLayout from './AuthLayout';
import { lengkapiPendaftaran } from '../../services/auth';
import { pesanError } from '../../lib/errors';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { validasiDaftar } from './Daftar';

/** Untuk pendaftar lewat Google: lengkapi nomor HP dan rumah. */
export default function LengkapiData() {
  const nav = useNavigate();
  const { blok } = useSettings();
  const { warga, refreshProfil, signOut } = useAuth();
  const [f, setF] = useState({ nama: warga?.nama || '', hp: '', blok: warga?.blok || '', noRumah: warga?.no_rumah || '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const er = validasiDaftar(f, { butuhSandi: false });
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true); setErr('');
    try {
      await lengkapiPendaftaran(f);
      await refreshProfil();
      nav('/menunggu', { replace: true });
    } catch (e2) { setErr(pesanError(e2)); } finally { setLoading(false); }
  }

  return (
    <AuthLayout compactBrand>
      <form onSubmit={submit} className="stack" noValidate>
        <div>
          <h1 className="auth-title green">Lengkapi Data</h1>
          <p className="auth-sub">Satu langkah lagi. Isi data berikut agar pengurus dapat memverifikasi Anda.</p>
        </div>
        {err && <Alert tone="error" icon={CircleAlert}>{err}</Alert>}
        <Input placeholder="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} maxLength={80} />
        <PhoneInput placeholder="Nomor HP" value={f.hp} onChange={set('hp')} error={errors.hp} />
        <div className="form-grid">
          <Select placeholder="Pilih blok" value={f.blok} onChange={set('blok')} error={errors.blok} options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
          <Input placeholder="No. rumah" value={f.noRumah} onChange={set('noRumah')} error={errors.noRumah} maxLength={6} />
        </div>
        <Button type="submit" block loading={loading}>Kirim</Button>
        <button type="button" className="link-sm" style={{ alignSelf: 'center' }} onClick={signOut}>Keluar</button>
      </form>
    </AuthLayout>
  );
}
