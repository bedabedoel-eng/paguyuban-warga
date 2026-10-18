import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ErrorState, ImagePicker, Input, Loader, StorageImage, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailKegiatan, simpanKegiatan } from '../../services/kegiatan';
import { uploadFile, removeFile } from '../../lib/storage';
import { toLocalInput } from '../../lib/format';

export default function FormKegiatan() {
  const { id } = useParams();
  const s = useAsync(() => (id ? detailKegiatan(id) : Promise.resolve(null)), [id]);
  if (s.loading && s.data === undefined) return <><PageHeader title="Kegiatan" /><Loader /></>;
  if (s.error) return <><PageHeader title="Kegiatan" /><div className="page"><ErrorState error={s.error} /></div></>;
  return <Isi awal={s.data} id={id} />;
}

function Isi({ awal, id }) {
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({
    judul: awal?.judul || '', lokasi: awal?.lokasi || '', deskripsi: awal?.deskripsi || '',
    mulai: toLocalInput(awal?.mulai), selesai: toLocalInput(awal?.selesai),
    perlu_daftar: awal?.perlu_daftar ?? true, kuota: awal?.kuota || '',
  });
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.judul.trim().length < 3) er.judul = 'Judul minimal 3 huruf';
    if (f.lokasi.trim().length < 2) er.lokasi = 'Lokasi wajib diisi';
    if (!f.mulai) er.mulai = 'Pilih waktu mulai';
    if (!f.selesai) er.selesai = 'Pilih waktu selesai';
    else if (f.mulai && f.selesai < f.mulai) er.selesai = 'Waktu selesai harus setelah mulai';
    if (f.kuota && Number(f.kuota) < 1) er.kuota = 'Kuota minimal 1';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      let gambar_path = awal?.gambar_path || null;
      if (foto) gambar_path = await uploadFile('konten', 'kegiatan', foto);
      const row = await simpanKegiatan({
        id, judul: f.judul.trim(), lokasi: f.lokasi.trim(), deskripsi: f.deskripsi.trim() || null,
        mulai: new Date(f.mulai).toISOString(), selesai: new Date(f.selesai).toISOString(),
        perlu_daftar: f.perlu_daftar, kuota: f.kuota ? Number(f.kuota) : null, gambar_path,
      });
      if (awal?.gambar_path && gambar_path !== awal.gambar_path) removeFile('konten', awal.gambar_path).catch(() => {});
      toast.success(id ? 'Kegiatan diperbarui' : 'Kegiatan dibuat');
      nav(`/kegiatan/${row.id}`, { replace: true });
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <>
      <PageHeader title={id ? 'Ubah Kegiatan' : 'Buat Kegiatan'} />
      <div className="page form">
        <Card pad>
          <form className="stack" onSubmit={simpan} noValidate>
            <Input label="Nama kegiatan" value={f.judul} onChange={set('judul')} error={err.judul} maxLength={120} />
            <Input label="Lokasi" value={f.lokasi} onChange={set('lokasi')} error={err.lokasi} maxLength={120} />
            <div className="form-grid">
              <Input label="Mulai" type="datetime-local" value={f.mulai} onChange={set('mulai')} error={err.mulai} />
              <Input label="Selesai" type="datetime-local" value={f.selesai} onChange={set('selesai')} error={err.selesai} />
            </div>
            <Textarea label="Deskripsi" value={f.deskripsi} onChange={set('deskripsi')} maxLength={3000} />
            <div className="form-grid">
              <label className="checkbox"><input type="checkbox" checked={f.perlu_daftar} onChange={(e) => setF((s) => ({ ...s, perlu_daftar: e.target.checked }))} />Warga perlu mendaftar</label>
              {f.perlu_daftar && <Input label="Kuota (kosongkan bila tanpa batas)" type="number" min="1" value={f.kuota} onChange={set('kuota')} error={err.kuota} />}
            </div>
            <div className="field"><span className="label">Gambar (opsional)</span><ImagePicker file={foto} onChange={setFoto} />
              {awal?.gambar_path && !foto && <div className="thumb"><StorageImage path={awal.gambar_path} /></div>}</div>
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
