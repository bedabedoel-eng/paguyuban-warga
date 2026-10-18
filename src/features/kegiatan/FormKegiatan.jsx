import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ErrorState, ImagePicker, Input, Select, StorageImage, Textarea, Checkbox, Field, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailKegiatan, simpanKegiatan } from '../../services/kegiatan';
import { uploadFile, removeFile } from '../../lib/storage';
import { opsiSasaran } from '../../lib/akses';
import { toLocalInput } from '../../lib/format';

export default function FormKegiatan() {
  const { id } = useParams();
  const s = useAsync(() => (id ? detailKegiatan(id) : Promise.resolve(null)), [id]);
  if (s.loading && s.data === undefined) return <div className="page form"><PageHeader back title="Kegiatan" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error) return <div className="page form"><PageHeader back title="Kegiatan" /><ErrorState error={s.error} /></div>;
  return <Isi awal={s.data} id={id} />;
}

function Isi({ awal, id }) {
  const { hak } = useAuth();
  const { blok } = useSettings();
  const toast = useToast();
  const nav = useNavigate();
  const sasaran = opsiSasaran(hak, blok);
  const [f, setF] = useState({
    judul: awal?.judul || '', lokasi: awal?.lokasi || '', deskripsi: awal?.deskripsi || '',
    mulai: toLocalInput(awal?.mulai), selesai: toLocalInput(awal?.selesai),
    perlu_daftar: awal?.perlu_daftar ?? true, kuota: awal?.kuota || '', blok: awal ? awal.blok || '' : sasaran[0]?.value ?? '',
  });
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.judul.trim().length < 3) er.judul = 'Nama kegiatan minimal 3 huruf';
    if (f.lokasi.trim().length < 2) er.lokasi = 'Isi lokasi kegiatan';
    if (!f.mulai) er.mulai = 'Pilih waktu mulai';
    if (!f.selesai) er.selesai = 'Pilih waktu selesai';
    else if (f.mulai && f.selesai < f.mulai) er.selesai = 'Waktu selesai harus setelah waktu mulai';
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
        perlu_daftar: f.perlu_daftar, kuota: f.perlu_daftar && f.kuota ? Number(f.kuota) : null, gambar_path, blok: f.blok || null,
      });
      if (awal?.gambar_path && gambar_path !== awal.gambar_path) removeFile('konten', awal.gambar_path).catch(() => {});
      toast.success(id ? 'Kegiatan diperbarui' : 'Kegiatan dijadwalkan. Warga sasaran menerima notifikasi.');
      nav(`/kegiatan/${row.id}`, { replace: true });
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <div className="page form">
      <PageHeader back title={id ? 'Ubah kegiatan' : 'Jadwalkan kegiatan'} />
      <Card pad>
        <form className="stack" onSubmit={simpan} noValidate>
          <div className="form-section">
            <Input label="Nama kegiatan" value={f.judul} onChange={set('judul')} error={err.judul} maxLength={120} placeholder="Contoh: Senam pagi bersama" />
            <Input label="Lokasi" value={f.lokasi} onChange={set('lokasi')} error={err.lokasi} maxLength={120} placeholder="Contoh: Lapangan Gang A" />
            <div className="form-grid">
              <Input label="Mulai" type="datetime-local" value={f.mulai} onChange={set('mulai')} error={err.mulai} />
              <Input label="Selesai" type="datetime-local" value={f.selesai} onChange={set('selesai')} error={err.selesai} />
            </div>
            <Textarea label="Deskripsi" optional value={f.deskripsi} onChange={set('deskripsi')} maxLength={3000} placeholder="Apa yang perlu dibawa, siapa penanggung jawab, dll." />
          </div>
          <div className="form-section">
            <Select label="Ditujukan untuk" value={f.blok} onChange={set('blok')} options={sasaran} disabled={!!id && !hak.kelola_anggota} />
            <Checkbox checked={f.perlu_daftar} onChange={(v) => setF((s) => ({ ...s, perlu_daftar: v }))} hint="Warga menekan tombol Ikut kegiatan, dan panitia melihat daftar peserta.">Warga perlu mendaftar</Checkbox>
            {f.perlu_daftar && <Input label="Kuota peserta" optional type="number" min="1" value={f.kuota} onChange={set('kuota')} error={err.kuota} hint="Kosongkan bila tanpa batas" />}
            <Field label="Gambar" optional><ImagePicker file={foto} onChange={setFoto} />
              {awal?.gambar_path && !foto && <span className="thumb" style={{ width: 96, height: 64 }}><StorageImage path={awal.gambar_path} /></span>}</Field>
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => nav(-1)}>Batal</Button>
            <Button type="submit" icon={Save} loading={loading}>{id ? 'Simpan perubahan' : 'Jadwalkan'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
