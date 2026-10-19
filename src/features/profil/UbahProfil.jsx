import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, Input, Textarea, FotoInput, PernikahanFields, galatAnak, kolomPernikahan, Callout } from '../../components/ui';
import FotoWarga from '../../components/ui/FotoWarga';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ubahProfil, ubahKontak } from '../../services/warga';
import { FOTO_AWAL, terapkanFoto } from '../../lib/foto';

export default function UbahProfil() {
  const { warga, kontak, user, setWarga, setKontak } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ nama: warga.nama, pekerjaan: warga.pekerjaan || '', hobi: warga.hobi || '', keluarga: warga.keluarga || '', tentang: warga.tentang || '', email: kontak?.email || '', status_pernikahan: kontak?.status_pernikahan || '', jumlah_anak: kontak?.jumlah_anak ?? '' });
  const [foto, setFoto] = useState(FOTO_AWAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.nama.trim().length < 2) er.nama = 'Nama minimal 2 huruf';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Format email tidak valid';
    const ga = galatAnak(f.status_pernikahan, f.jumlah_anak);
    if (ga) er.anak = ga;
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const foto_path = await terapkanFoto(foto, { folder: `avatar/${user.id}`, lama: warga.foto_path, opsi: { maxSize: 960, quality: 0.82, aspect: 3 / 4 } });
      const w = await ubahProfil(user.id, { nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, hobi: f.hobi.trim() || null, keluarga: f.keluarga.trim() || null, tentang: f.tentang.trim() || null, foto_path });
      setWarga(w);
      setKontak(await ubahKontak(user.id, { email: f.email.trim() || null, ...kolomPernikahan(f.status_pernikahan, f.jumlah_anak) }));
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
              <FotoInput value={foto} onChange={setFoto} adaFoto={!!warga.foto_path} />
            </div>
          </div>
          <div className="form-grid">
            <Input fieldClass="span-2" label="Nama lengkap" value={f.nama} onChange={set('nama')} error={errors.nama} maxLength={80} />
            <Input label="Pekerjaan / keahlian" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} placeholder="Contoh: Guru, Montir" />
            <Input label="Email" optional type="email" value={f.email} onChange={set('email')} error={errors.email} maxLength={120} />
            <Input label="Keluarga" optional value={f.keluarga} onChange={set('keluarga')} maxLength={120} placeholder="Contoh: Istri dan 2 anak" />
            <Input label="Hobi" optional value={f.hobi} onChange={set('hobi')} maxLength={120} placeholder="Contoh: Bulu tangkis" />
            <PernikahanFields status={f.status_pernikahan} anak={f.jumlah_anak} errors={errors}
              onStatus={(v) => setF((s) => ({ ...s, status_pernikahan: v, jumlah_anak: v && v !== 'belum_menikah' ? s.jumlah_anak : '' }))}
              onAnak={(v) => setF((s) => ({ ...s, jumlah_anak: v }))} />
          </div>
          <Textarea label="Tentang saya" optional value={f.tentang} onChange={set('tentang')} maxLength={500} />
          <Callout tone="neutral">Nomor HP, jalan, dan nomor rumah dikelola sekretaris atau admin agar data tagihan tetap akurat. Status pernikahan dan jumlah anak hanya terlihat oleh Anda dan pengurus (untuk data sensus warga).</Callout>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => nav(-1)}>Batal</Button>
            <Button type="submit" icon={Save} loading={loading}>Simpan profil</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
