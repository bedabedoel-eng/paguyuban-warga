import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, Input, Textarea, ImagePicker, Callout } from '../../components/ui';
import FotoWarga from '../../components/ui/FotoWarga';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahProfil, ubahKontak } from '../../services/warga';
import { uploadFile, removeFile } from '../../lib/storage';

export default function UbahProfil() {
  const { warga, kontak, user, setWarga, setKontak } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ nama: warga.nama, pekerjaan: warga.pekerjaan || '', hobi: warga.hobi || '', keluarga: warga.keluarga || '', tentang: warga.tentang || '', email: kontak?.email || '' });
  const [foto, setFoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.nama.trim().length < 2) er.nama = 'Nama minimal 2 huruf';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Format email tidak valid';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      let foto_path = warga.foto_path;
      if (foto) {
        foto_path = await uploadFile('konten', `avatar/${user.id}`, foto, { maxSize: 960, quality: 0.82, aspect: 3 / 4 });
        if (warga.foto_path) removeFile('konten', warga.foto_path).catch(() => {});
      }
      const w = await ubahProfil(user.id, { nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, hobi: f.hobi.trim() || null, keluarga: f.keluarga.trim() || null, tentang: f.tentang.trim() || null, foto_path });
      setWarga(w);
      if ((kontak?.email || '') !== f.email.trim()) setKontak(await ubahKontak(user.id, { email: f.email.trim() || null }));
      toast.success('Profil disimpan');
      nav('/profil');
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <div className="page form">
      <PageHeader back="/profil" title="Ubah profil" desc="Informasi ini terlihat oleh sesama anggota di direktori warga." />
      <Card pad>
        <form className="stack" onSubmit={simpan} noValidate>
          <div className="row row-top wrap" style={{ gap: 16 }}>
            <FotoWarga nama={f.nama} path={warga.foto_path} className="foto-edit" />
            <div className="grow" style={{ minWidth: 220 }}>
              <ImagePicker file={foto} onChange={setFoto} label="Ganti foto profil" ratio="3 / 4" hint="Foto berdiri/setengah badan, rasio 3:4. JPG, PNG, atau WEBP · maks. 5 MB" />
            </div>
          </div>
          <div className="form-grid">
            <Input fieldClass="span-2" label="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} maxLength={80} />
            <Input label="Pekerjaan / keahlian" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} placeholder="Contoh: Guru, Montir" />
            <Input label="Email" optional type="email" value={f.email} onChange={set('email')} error={errors.email} maxLength={120} />
            <Input label="Keluarga" optional value={f.keluarga} onChange={set('keluarga')} maxLength={120} placeholder="Contoh: Istri dan 2 anak" />
            <Input label="Hobi" optional value={f.hobi} onChange={set('hobi')} maxLength={120} placeholder="Contoh: Bulu tangkis" />
          </div>
          <Textarea label="Tentang saya" optional value={f.tentang} onChange={set('tentang')} maxLength={500} />
          <Callout tone="neutral">Nomor HP, gang, dan nomor rumah dikelola sekretaris atau admin agar data tagihan tetap akurat.</Callout>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => nav(-1)}>Batal</Button>
            <Button type="submit" icon={Save} loading={loading}>Simpan profil</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
