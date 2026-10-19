import PageHeader from '../../components/layout/PageHeader';
import { Card, CardBody, Toggle, Callout } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahKontak } from '../../services/warga';

export default function Privasi() {
  const { kontak, user, setKontak } = useAuth();
  const toast = useToast();
  async function ubah(k, v) {
    try { setKontak(await ubahKontak(user.id, { [k]: v })); toast.success('Pengaturan privasi disimpan'); } catch (e) { toast.error(e); }
  }
  const row = (k, t, s) => (
    <div className="rowi">
      <span className="rowi-main"><span className="rowi-title">{t}</span><span className="rowi-sub">{s}</span></span>
      <Toggle label={t} checked={kontak?.[k]} onChange={(v) => ubah(k, v)} />
    </div>
  );
  return (
    <div className="page narrow">
      <PageHeader back="/pengaturan" title="Privasi" />
      <Card>
        <div className="rows inset">
          {row('tampilkan_hp', 'Tampilkan nomor HP ke warga', 'Tetangga dapat menelepon atau mengirim WhatsApp dari direktori')}
          {row('tampilkan_email', 'Tampilkan email ke warga', 'Hanya berlaku bila Anda mengisi email')}
        </div>
      </Card>
      <Callout tone="neutral">Terlepas dari pengaturan ini, pengurus yang berwenang (sekretaris, pimpinan, bendahara, dan humas jalan Anda) tetap dapat melihat nomor HP untuk keperluan administrasi.</Callout>
      <Card><CardBody className="text-sm muted">Data tagihan dan aspirasi Anda tidak pernah tampil ke warga lain.</CardBody></Card>
    </div>
  );
}
