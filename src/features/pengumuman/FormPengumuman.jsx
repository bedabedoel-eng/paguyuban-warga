import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ErrorState, ImagePicker, Input, Select, StorageImage, Textarea, Checkbox, Field, SkeletonRows, ChoiceGroup, Callout } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailPengumuman, simpanPengumuman } from '../../services/pengumuman';
import { uploadFile, removeFile } from '../../lib/storage';
import { opsiSasaran } from '../../lib/akses';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';

export default function FormPengumuman() {
  const { id } = useParams();
  const s = useAsync(() => (id ? detailPengumuman(id) : Promise.resolve(null)), [id]);
  if (s.loading && s.data === undefined) return <div className="page form"><PageHeader back title="Pengumuman" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error) return <div className="page form"><PageHeader back title="Pengumuman" /><ErrorState error={s.error} /></div>;
  return <Isi awal={s.data} id={id} />;
}

function Isi({ awal, id }) {
  const { hak } = useAuth();
  const { blok } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const sasaran = opsiSasaran(hak, blok);
  const [f, setF] = useState({ judul: awal?.judul || '', ringkasan: awal?.ringkasan || '', isi: awal?.isi || '', kategori: awal?.kategori || 'umum', disematkan: awal?.disematkan || false, blok: awal ? awal.blok || '' : sasaran[0]?.value ?? '' });
  const [foto, setFoto] = useState(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.judul.trim().length < 3) er.judul = 'Judul minimal 3 huruf';
    if (f.isi.trim().length < 3) er.isi = 'Isi pengumuman wajib diisi';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      let gambar_path = awal?.gambar_path || null;
      if (foto) gambar_path = await uploadFile('konten', 'pengumuman', foto);
      else if (hapusFoto) gambar_path = null;
      const row = await simpanPengumuman({ id, judul: f.judul.trim(), ringkasan: f.ringkasan.trim() || null, isi: f.isi.trim(), kategori: f.kategori, disematkan: f.disematkan, gambar_path, blok: f.blok || null });
      if (awal?.gambar_path && gambar_path !== awal.gambar_path) removeFile('konten', awal.gambar_path).catch(() => {});
      toast.success(id ? 'Pengumuman diperbarui' : f.blok ? `Diterbitkan untuk warga Gang ${f.blok}` : 'Diterbitkan. Semua warga menerima notifikasi.');
      nav(`/pengumuman/${row.id}`, { replace: true });
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <div className="page form">
      <PageHeader back title={id ? 'Ubah pengumuman' : 'Buat pengumuman'} desc={id ? undefined : 'Warga sasaran menerima notifikasi saat pengumuman diterbitkan.'} />
      <Card pad>
        <form className="stack" onSubmit={simpan} noValidate>
          <div className="form-section">
            <Field label="Kategori"><ChoiceGroup value={f.kategori} onChange={(v) => setF((s) => ({ ...s, kategori: v }))} label="Kategori" options={Object.entries(KATEGORI_PENGUMUMAN).map(([value, v]) => ({ value, label: v.label }))} /></Field>
            <Input label="Judul" value={f.judul} onChange={set('judul')} error={err.judul} maxLength={120} placeholder="Contoh: Kerja bakti bersih saluran air" />
            <Input label="Ringkasan" optional value={f.ringkasan} onChange={set('ringkasan')} maxLength={160} hint="Tampil di notifikasi. Bila kosong, diambil dari awal isi." />
            <Textarea label="Isi pengumuman" value={f.isi} onChange={set('isi')} error={err.isi} maxLength={5000} style={{ minHeight: 200 }} />
          </div>
          <div className="form-section">
            <div className="form-grid">
              <Select label="Ditujukan untuk" value={f.blok} onChange={set('blok')} options={sasaran} disabled={!!id && !hak.kelola_anggota} />
              <div style={{ alignSelf: 'end', paddingBottom: 10 }}><Checkbox checked={f.disematkan} onChange={(v) => setF((s) => ({ ...s, disematkan: v }))}>Sematkan di urutan teratas</Checkbox></div>
            </div>
            {!hak.kelola_anggota && <Callout tone="neutral">Sebagai Humas Gang, pengumuman Anda hanya tampil untuk warga gang yang Anda pegang.</Callout>}
            <Field label="Gambar" optional>
              <ImagePicker file={foto} onChange={setFoto} />
              {awal?.gambar_path && !foto && !hapusFoto && (
                <div className="row"><span className="thumb" style={{ width: 96, height: 64 }}><StorageImage path={awal.gambar_path} /></span><Button size="xs" variant="secondary" onClick={() => setHapusFoto(true)}>Hapus gambar</Button></div>
              )}
            </Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => nav(-1)}>Batal</Button>
            <Button type="submit" icon={id ? Save : Send} loading={loading}>{id ? 'Simpan perubahan' : 'Terbitkan'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
