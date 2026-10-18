import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ErrorState, ImagePicker, Input, Loader, Select, StorageImage, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailPengumuman, simpanPengumuman } from '../../services/pengumuman';
import { uploadFile, removeFile } from '../../lib/storage';

export default function FormPengumuman() {
  const { id } = useParams();
  const toast = useToast();
  const nav = useNavigate();
  const s = useAsync(() => (id ? detailPengumuman(id) : Promise.resolve(null)), [id]);
  if (s.loading && s.data === undefined) return <><PageHeader title="Pengumuman" /><Loader /></>;
  if (s.error) return <><PageHeader title="Pengumuman" /><div className="page"><ErrorState error={s.error} /></div></>;
  return <Isi awal={s.data} id={id} toast={toast} nav={nav} />;
}

function Isi({ awal, id, toast, nav }) {
  const [f, setF] = useState({ judul: awal?.judul || '', ringkasan: awal?.ringkasan || '', isi: awal?.isi || '', kategori: awal?.kategori || 'umum', disematkan: awal?.disematkan || false });
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
      const row = await simpanPengumuman({ id, judul: f.judul.trim(), ringkasan: f.ringkasan.trim() || null, isi: f.isi.trim(), kategori: f.kategori, disematkan: f.disematkan, gambar_path });
      if (awal?.gambar_path && gambar_path !== awal.gambar_path) removeFile('konten', awal.gambar_path).catch(() => {});
      toast.success(id ? 'Pengumuman diperbarui' : 'Pengumuman diterbitkan. Warga akan menerima notifikasi.');
      nav(`/pengumuman/${row.id}`, { replace: true });
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <>
      <PageHeader title={id ? 'Ubah Pengumuman' : 'Buat Pengumuman'} />
      <div className="page form">
        <Card pad>
          <form className="stack" onSubmit={simpan} noValidate>
            <Input label="Judul" value={f.judul} onChange={set('judul')} error={err.judul} maxLength={120} />
            <div className="form-grid">
              <Select label="Kategori" value={f.kategori} onChange={set('kategori')} options={[{ value: 'umum', label: 'Umum' }, { value: 'penting', label: 'Penting' }, { value: 'kegiatan', label: 'Kegiatan' }, { value: 'info', label: 'Info' }]} />
              <label className="checkbox" style={{ alignSelf: 'end', height: 42 }}><input type="checkbox" checked={f.disematkan} onChange={(e) => setF((s) => ({ ...s, disematkan: e.target.checked }))} />Sematkan di atas</label>
            </div>
            <Input label="Ringkasan (opsional)" value={f.ringkasan} onChange={set('ringkasan')} maxLength={160} />
            <Textarea label="Isi pengumuman" value={f.isi} onChange={set('isi')} error={err.isi} maxLength={5000} style={{ minHeight: 180 }} />
            <div className="field">
              <span className="label">Gambar (opsional)</span>
              <ImagePicker file={foto} onChange={setFoto} previewUrl={null} />
              {awal?.gambar_path && !foto && !hapusFoto && (
                <div className="row"><div className="thumb"><StorageImage path={awal.gambar_path} /></div><Button size="xs" variant="outline" onClick={() => setHapusFoto(true)}>Hapus gambar</Button></div>
              )}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => nav(-1)}>Batal</Button>
              <Button type="submit" loading={loading}>{id ? 'Simpan' : 'Terbitkan'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
