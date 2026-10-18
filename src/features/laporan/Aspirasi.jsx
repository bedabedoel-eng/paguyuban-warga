import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, ImagePicker, Input, Textarea, Loader, StorageImage, EmptyState, SegTabs } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { buatLaporan, laporanSaya } from '../../services/laporan';
import { uploadFile, removeFile } from '../../lib/storage';
import { KATEGORI_LAPORAN, STATUS_LAPORAN } from '../../lib/constants';
import { tanggalJam } from '../../lib/format';

export default function Aspirasi() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('buat');
  const [kat, setKat] = useState('');
  const [judul, setJudul] = useState('');
  const [desk, setDesk] = useState('');
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const riwayat = useAsync(() => laporanSaya(user.id), [user.id]);

  async function kirim(e) {
    e.preventDefault();
    const er = {};
    if (!kat) er.kat = 'Pilih kategori laporan';
    if (judul.trim().length < 3) er.judul = 'Judul minimal 3 huruf';
    if (desk.trim().length < 5) er.desk = 'Deskripsi minimal 5 huruf';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    let path = null;
    try {
      if (foto) path = await uploadFile('konten', `laporan/${user.id}`, foto);
      await buatLaporan({ kategori: kat, judul: judul.trim(), deskripsi: desk.trim(), foto_path: path });
      toast.success('Laporan terkirim. Pengurus akan menindaklanjuti.');
      setKat(''); setJudul(''); setDesk(''); setFoto(null);
      riwayat.reload(); setTab('riwayat');
    } catch (e2) { if (path) removeFile('konten', path).catch(() => {}); toast.error(e2); } finally { setLoading(false); }
  }

  return (
    <>
      <PageHeader title="Laporan" />
      <div className="page form">
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'buat', label: 'Buat Laporan' }, { value: 'riwayat', label: 'Laporan Saya' }]} />
          {tab === 'buat' ? (
            <Card pad>
              <form className="stack" onSubmit={kirim} noValidate>
                <div className="cat-grid" role="group" aria-label="Kategori">
                  {Object.entries(KATEGORI_LAPORAN).map(([k, v]) => (
                    <button type="button" key={k} className="cat-btn" aria-pressed={kat === k} onClick={() => setKat(k)}><v.icon size={17} />{v.label}</button>
                  ))}
                </div>
                {err.kat && <span className="error small red">{err.kat}</span>}
                <Input label="Judul Laporan" placeholder="Contoh: Lampu jalan mati" value={judul} onChange={(e) => setJudul(e.target.value)} error={err.judul} maxLength={120} />
                <Textarea label="Deskripsi" placeholder="Jelaskan masalah dengan detail..." value={desk} onChange={(e) => setDesk(e.target.value)} error={err.desk} maxLength={3000} />
                <div className="field"><span className="label">Foto Pendukung</span><ImagePicker file={foto} onChange={setFoto} /></div>
                <Button type="submit" block size="lg" loading={loading}>Kirim Laporan</Button>
              </form>
            </Card>
          ) : riwayat.loading && !riwayat.data ? <Loader /> : !riwayat.data?.length ? (
            <Card><EmptyState icon={MessageSquareText} title="Belum ada laporan" text="Laporan yang Anda kirim akan tampil di sini beserta statusnya." /></Card>
          ) : riwayat.data.map((l) => {
            const k = KATEGORI_LAPORAN[l.kategori]; const st = STATUS_LAPORAN[l.status];
            return (
              <Card pad key={l.id} className="stack sm">
                <div className="row between"><Badge tone="green">{k.label}</Badge><Badge tone={st.tone}>{st.label}</Badge></div>
                <h3>{l.judul}</h3>
                <p className="small text-2" style={{ whiteSpace: 'pre-wrap' }}>{l.deskripsi}</p>
                {l.foto_path && <div className="thumb" style={{ width: 120, height: 80 }}><StorageImage path={l.foto_path} /></div>}
                {l.tanggapan && <div className="alert info"><div><b>Tanggapan pengurus:</b> {l.tanggapan}</div></div>}
                <span className="tiny muted">{tanggalJam(l.created_at)}</span>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
