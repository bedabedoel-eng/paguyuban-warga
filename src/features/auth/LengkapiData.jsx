import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, PhoneInput, Callout } from '../../components/ui';
import AlamatFields from './AlamatFields';
import AuthLayout from './AuthLayout';
import { lengkapiPendaftaran } from '../../services/auth';
import { pesanError } from '../../lib/errors';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { validasiDaftar } from './Daftar';

/** Untuk pendaftar lewat Google: lengkapi nomor HP dan rumah. */
export default function LengkapiData() {
  const nav = useNavigate();
  const { gang } = useSettings();
  const { warga, refreshProfil, signOut } = useAuth();
  const [f, setF] = useState({ nama: warga?.nama || '', hp: '', blok: warga?.blok || '', gang: warga?.gang_id || '', noRumah: warga?.no_rumah || '' });
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const er = validasiDaftar(f, { butuhSandi: false, gang });
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
    <AuthLayout>
      <div className="auth-title">
        <h1>Lengkapi data rumah</h1>
        <p>Pengurus memerlukan data ini untuk memverifikasi Anda.</p>
      </div>
      <form onSubmit={submit} className="stack" noValidate>
        {err && <Callout tone="bad">{err}</Callout>}
        <Input label="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} maxLength={80} />
        <PhoneInput label="Nomor HP" value={f.hp} onChange={set('hp')} error={errors.hp} />
        <AlamatFields f={f} setF={setF} errors={errors} />
        <Button type="submit" block size="lg" loading={loading}>Kirim untuk diverifikasi</Button>
      </form>
      <p className="auth-foot"><button type="button" className="link" onClick={signOut}>Keluar</button></p>
    </AuthLayout>
  );
}
