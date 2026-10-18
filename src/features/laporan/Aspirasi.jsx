import { useState } from 'react';
import { MessageSquareText, Send, MessageSquareReply } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, CardBody, ImagePicker, Input, Textarea, StorageImage, EmptyState, LineTabs, Field, SkeletonRows, Callout, ErrorState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { buatLaporan, laporanSaya } from '../../services/laporan';
import { uploadFile, removeFile } from '../../lib/storage';
import { KATEGORI_LAPORAN, STATUS_LAPORAN } from '../../lib/constants';
import { relatif } from '../../lib/format';

export default function Aspirasi() {
  const { user, warga } = useAuth();
  const toast = useToast();
  const riwayat = useAsync(() => laporanSaya(user.id), [user.id]);
  const [tab, setTab] = useState('buat');
  const [kat, setKat] = useState('');
  const [judul, setJudul] = useState('');
  const [desk, setDesk] = useState('');
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const aktif = (riwayat.data || []).filter((l) => ['baru', 'diproses'].includes(l.status)).length;

  async function kirim(e) {
    e.preventDefault();
    const er = {};
    if (!kat) er.kat = 'Pilih jenis aspirasi';
    if (judul.trim().length < 3) er.judul = 'Judul minimal 3 huruf';
    if (desk.trim().length < 5) er.desk = 'Ceritakan lebih detail (minimal 5 huruf)';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    let path = null;
    try {
      if (foto) path = await uploadFile('konten', `laporan/${user.id}`, foto);
      await buatLaporan({ kategori: kat, judul: judul.trim(), deskripsi: desk.trim(), foto_path: path });
      toast.success('Aspirasi terkirim ke humas gang dan pimpinan paguyuban');
      setKat(''); setJudul(''); setDesk(''); setFoto(null);
      riwayat.reload(); setTab('riwayat');
    } catch (e2) { if (path) removeFile('konten', path).catch(() => {}); toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <div className="page form">
      <PageHeader title="Aspirasi & laporan" desc={`Sampaikan masalah atau usulan. Diteruskan ke humas Gang ${warga?.blok || ''} serta ketua dan wakil ketua.`} />
      <LineTabs value={tab} onChange={setTab} tabs={[{ value: 'buat', label: 'Sampaikan' }, { value: 'riwayat', label: 'Aspirasi saya', count: aktif }]} />
      {tab === 'buat' ? (
        <Card pad>
          <form className="stack" onSubmit={kirim} noValidate>
            <Field label="Jenis aspirasi" error={err.kat}>
              <div className="choice-grid" role="radiogroup" aria-label="Jenis aspirasi">
                {Object.entries(KATEGORI_LAPORAN).map(([k, v]) => (
                  <button type="button" key={k} role="radio" aria-checked={kat === k} aria-pressed={kat === k} className="choice" onClick={() => setKat(k)}><v.icon size={18} />{v.label}</button>
                ))}
              </div>
            </Field>
            <Input label="Judul" placeholder="Contoh: Lampu jalan depan No. 12 mati" value={judul} onChange={(e) => setJudul(e.target.value)} error={err.judul} maxLength={120} />
            <Textarea label="Ceritakan detailnya" placeholder="Lokasi persisnya, sejak kapan, dan dampaknya" value={desk} onChange={(e) => setDesk(e.target.value)} error={err.desk} maxLength={3000} />
            <Field label="Foto pendukung" optional><ImagePicker file={foto} onChange={setFoto} capture="environment" /></Field>
            <Button type="submit" block size="lg" icon={Send} loading={loading}>Kirim aspirasi</Button>
          </form>
        </Card>
      ) : riwayat.loading && !riwayat.data ? <Card pad><SkeletonRows n={3} /></Card> : riwayat.error ? <ErrorState error={riwayat.error} onRetry={riwayat.reload} /> : !riwayat.data?.length ? (
        <Card><EmptyState icon={MessageSquareText} title="Belum ada aspirasi" text="Aspirasi yang Anda kirim tampil di sini beserta tanggapan pengurus." action={<Button size="sm" onClick={() => setTab('buat')}>Sampaikan aspirasi</Button>} /></Card>
      ) : riwayat.data.map((l) => {
        const K = KATEGORI_LAPORAN[l.kategori]; const st = STATUS_LAPORAN[l.status];
        return (
          <Card key={l.id}>
            <CardBody className="stack-sm">
              <div className="row between"><span className="row text-sm muted" style={{ gap: 6 }}><K.icon size={15} />{K.label} · {relatif(l.created_at)}</span><Badge tone={st.tone} dot>{st.label}</Badge></div>
              <h3 style={{ fontSize: 'var(--fs-lg)' }}>{l.judul}</h3>
              <p className="ink-2 pre-wrap">{l.deskripsi}</p>
              {l.foto_path && <span className="thumb" style={{ width: 140, height: 94 }}><StorageImage path={l.foto_path} /></span>}
              {l.tanggapan ? <Callout tone={l.status === 'ditolak' ? 'warn' : 'ok'} icon={MessageSquareReply}><b>Tanggapan pengurus:</b> {l.tanggapan}</Callout>
                : <p className="text-sm muted">Belum ada tanggapan. Anda akan menerima notifikasi saat pengurus menanggapi.</p>}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
