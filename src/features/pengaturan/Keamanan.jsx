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

  // Khusus PIN lama: izinkan huruf dan angka (karena sandi lama warga mungkin campuran)
  const setLama = (e) => setF((s) => ({ ...s, lama: e.target.value }));
  // Khusus PIN baru & konfirmasi: hanya boleh angka minimal 6 digit
  const setPinBaru = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (!f.lama) er.lama = 'Isi kata sandi/PIN lama';
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
                <h2>Ubah ke PIN Keamanan</h2>
                <p className="small muted">Masukkan kata sandi lama Anda (bisa berupa huruf/angka), lalu buat PIN angka baru minimal 6 digit.</p>
                
                {/* Kolom PIN Lama: Mengizinkan Huruf & Angka */}
                <PasswordInput
                  label="Kata Sandi / PIN Lama"
                  value={f.lama}
                  onChange={setLama}
                  error={err.lama}
                  inputMode="text"
                  autoComplete="current-password"
                  hint="Masukkan sandi lama Anda yang sebelumnya"
                />

                {/* Kolom PIN Baru: Hanya Angka */}
                <PasswordInput
                  label="PIN Baru (Minimal 6 angka)"
                  value={f.baru}
                  onChange={setPinBaru('baru')}
                  error={err.baru}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="new-password"
                  hint="Gunakan minimal 6 digit angka (contoh: 123456)"
                />

                {/* Kolom Konfirmasi PIN Baru: Hanya Angka */}
                <PasswordInput
                  label="Konfirmasi PIN Baru"
                  value={f.ulang}
                  onChange={setPinBaru('ulang')}
                  error={err.ulang}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  autoComplete="new-password"
                />

                <Button type="submit" loading={loading}>Simpan PIN Baru</Button>
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
