import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, Input, Textarea, ImagePicker, Avatar, Toggle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahProfil, ubahKontak } from '../../services/warga';
import { uploadFile, removeFile } from '../../lib/storage';
import { StorageImage } from '../../components/ui';

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
        foto_path = await uploadFile('konten', `avatar/${user.id}`, foto, { maxSize: 600, quality: 0.82 });
        if (warga.foto_path) removeFile('konten', warga.foto_path).catch(() => {});
      }
      const w = await ubahProfil(user.id, {
        nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, hobi: f.hobi.trim() || null,
        keluarga: f.keluarga.trim() || null, tentang: f.tentang.trim() || null, foto_path,
      });
      setWarga(w);
      if ((kontak?.email || '') !== f.email.trim()) setKontak(await ubahKontak(user.id, { email: f.email.trim() || null }));
      toast.success('Profil disimpan');
      nav('/profil');
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <>
      <PageHeader title="Ubah Profil" />
      <div className="page form">
        <Card pad>
          <form className="stack" onSubmit={simpan} noValidate>
            <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
              <Avatar nama={warga.nama} path={warga.foto_path} size={72} />
              <div className="grow"><ImagePicker file={foto} onChange={setFoto} label="Ganti Foto Profil" hint="JPG, PNG (Max 5MB)" /></div>
            </div>
            <Input label="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} maxLength={80} />
            <div className="form-grid">
              <Input label="Pekerjaan" value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} placeholder="Contoh: Guru" />
              <Input label="Email (opsional)" type="email" value={f.email} onChange={set('email')} error={errors.email} maxLength={120} />
            </div>
            <Input label="Hobi" value={f.hobi} onChange={set('hobi')} maxLength={120} placeholder="Contoh: Fotografi, Traveling" />
            <Input label="Keluarga" value={f.keluarga} onChange={set('keluarga')} maxLength={120} placeholder="Contoh: Istri & 2 Anak" />
            <Textarea label="Tentang saya" value={f.tentang} onChange={set('tentang')} maxLength={500} />
            <p className="small muted">Blok dan nomor rumah serta nomor HP hanya dapat diubah oleh admin agar data tagihan tetap akurat.</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => nav(-1)}>Batal</Button>
              <Button type="submit" loading={loading}>Simpan</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
