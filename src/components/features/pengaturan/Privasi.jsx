import PageHeader from '../../components/layout/PageHeader';
import { Card, Toggle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahKontak } from '../../services/warga';

export default function Privasi() {
  const { kontak, user, setKontak } = useAuth();
  const toast = useToast();
  async function ubah(k, v) {
    try { setKontak(await ubahKontak(user.id, { [k]: v })); } catch (e) { toast.error(e); }
  }
  return (
    <>
      <PageHeader title="Privasi Profil" />
      <div className="page" style={{ maxWidth: 640 }}>
        <Card pad>
          <p className="small text-2 mb-3">Atur data kontak yang dapat dilihat sesama warga. Pengurus tetap dapat melihatnya untuk keperluan administrasi.</p>
          <div className="list">
            <div className="list-item"><span className="grow"><span className="title" style={{ display: 'block' }}>Tampilkan nomor HP</span><span className="sub">Warga lain dapat menghubungi Anda</span></span><Toggle label="Tampilkan nomor HP" checked={kontak?.tampilkan_hp} onChange={(v) => ubah('tampilkan_hp', v)} /></div>
            <div className="list-item"><span className="grow"><span className="title" style={{ display: 'block' }}>Tampilkan email</span><span className="sub">Hanya bila Anda mengisi email</span></span><Toggle label="Tampilkan email" checked={kontak?.tampilkan_email} onChange={(v) => ubah('tampilkan_email', v)} /></div>
          </div>
        </Card>
      </div>
    </>
  );
}
