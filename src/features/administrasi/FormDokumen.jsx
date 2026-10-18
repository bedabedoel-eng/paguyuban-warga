import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ErrorState, ImagePicker, Input, Textarea, Checkbox, Field, ChoiceGroup, SkeletonRows } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailDokumen, simpanDokumen } from '../../services/dokumen';
import { uploadFile, removeFile } from '../../lib/storage';
import { JENIS_DOKUMEN } from '../../lib/constants';
import { isoDate } from '../../lib/format';
import { IKON_DOK } from './Administrasi';

export default function FormDokumen() {
  const { id } = useParams();
  const s = useAsync(() => (id ? detailDokumen(id) : Promise.resolve(null)), [id]);
  if (s.loading && s.data === undefined) return <div className="page form"><PageHeader back title="Dokumen" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error) return <div className="page form"><PageHeader back title="Dokumen" /><ErrorState error={s.error} /></div>;
  return <Isi awal={s.data} id={id} />;
}

function Isi({ awal, id }) {
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ jenis: awal?.jenis || 'notulen', judul: awal?.judul || '', nomor: awal?.nomor || '', tanggal: awal?.tanggal || isoDate(), pihak: awal?.pihak || '', isi: awal?.isi || '', publik: awal?.publik || false });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const label = f.jenis === 'surat_masuk' ? 'Pengirim' : f.jenis === 'surat_keluar' ? 'Tujuan' : 'Peserta / pihak terkait';

  async function simpan(e) {
    e.preventDefault();
    const er = {};
    if (f.judul.trim().length < 3) er.judul = f.jenis === 'notulen' ? 'Isi nama rapat' : 'Isi perihal surat';
    if (!f.tanggal) er.tanggal = 'Pilih tanggal';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    let path;
    try {
      let lampiran_path = awal?.lampiran_path || null;
      if (file) { path = await uploadFile('bukti', `dokumen/${crypto.randomUUID().slice(0, 8)}`, file, { maxSize: 1800, quality: 0.85 }); lampiran_path = path; }
      const row = await simpanDokumen({ id, jenis: f.jenis, judul: f.judul.trim(), nomor: f.nomor.trim() || null, tanggal: f.tanggal, pihak: f.pihak.trim() || null, isi: f.isi.trim() || null, publik: f.publik, lampiran_path });
      if (file && awal?.lampiran_path) removeFile('bukti', awal.lampiran_path).catch(() => {});
      toast.success(f.publik && !awal?.publik ? 'Tersimpan dan dibagikan ke seluruh warga' : 'Dokumen tersimpan di arsip');
      nav(`/administrasi/${row.id}`, { replace: true });
    } catch (e2) { if (path) removeFile('bukti', path).catch(() => {}); toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <div className="page form">
      <PageHeader back title={id ? 'Ubah dokumen' : 'Arsipkan dokumen'} />
      <Card pad>
        <form className="stack" onSubmit={simpan} noValidate>
          <Field label="Jenis dokumen"><ChoiceGroup value={f.jenis} onChange={(v) => setF((s) => ({ ...s, jenis: v }))} label="Jenis dokumen" options={Object.entries(JENIS_DOKUMEN).map(([value, v]) => ({ value, label: v.label, icon: IKON_DOK[value] }))} /></Field>
          <Input label={f.jenis === 'notulen' ? 'Nama rapat' : 'Perihal'} value={f.judul} onChange={set('judul')} error={err.judul} maxLength={160} placeholder={f.jenis === 'notulen' ? 'Contoh: Rapat pengurus bulan Oktober' : 'Contoh: Permohonan izin penggunaan balai warga'} />
          <div className="form-grid">
            <Input label="Nomor" optional value={f.nomor} onChange={set('nomor')} maxLength={60} placeholder="012/PW/X/2026" />
            <Input label="Tanggal" type="date" value={f.tanggal} onChange={set('tanggal')} error={err.tanggal} />
            <Input fieldClass="span-2" label={label} optional value={f.pihak} onChange={set('pihak')} maxLength={120} />
          </div>
          <Textarea label={f.jenis === 'notulen' ? 'Isi notulen' : 'Ringkasan isi'} optional value={f.isi} onChange={set('isi')} maxLength={20000} style={{ minHeight: 200 }}
            placeholder={f.jenis === 'notulen' ? 'Agenda, pembahasan, keputusan, dan tindak lanjut beserta penanggung jawab.' : ''} />
          <Field label="Lampiran" optional hint="Foto atau PDF surat. Disimpan privat."><ImagePicker file={file} onChange={setFile} label="Pilih foto atau PDF" accept="image/jpeg,image/png,image/webp,application/pdf" hint="JPG, PNG, atau PDF · maks. 3 MB untuk PDF" /></Field>
          <Checkbox checked={f.publik} onChange={(v) => setF((s) => ({ ...s, publik: v }))} hint="Warga dapat membacanya di menu Notulen rapat dan menerima notifikasi. Tanpa centang, hanya pengurus yang melihat.">Bagikan ke seluruh warga</Checkbox>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => nav(-1)}>Batal</Button>
            <Button type="submit" icon={Save} loading={loading}>Simpan ke arsip</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
