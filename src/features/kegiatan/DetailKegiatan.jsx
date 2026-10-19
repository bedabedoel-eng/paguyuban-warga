import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Pencil, Trash2, Users } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardHead, CardBody, ErrorState, SkeletonRows, StorageImage, IconButton, EmptyState, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailKegiatan, hapusKegiatan, daftarIkut, batalIkut } from '../../services/kegiatan';
import { removeFile } from '../../lib/storage';
import { kelolaInfo } from '../../lib/akses';
import { jam, tanggal, parseDate } from '../../lib/format';
import { labelSasaran } from '../../lib/alamat';
import { useSettings } from '../../context/SettingsContext';

export default function DetailKegiatan() {
  const { id } = useParams();
  const { user, hak } = useAuth();
  const { gang, alamat } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const s = useAsync(() => detailKegiatan(id), [id]);
  if (s.loading && !s.data) return <div className="page narrow"><PageHeader back title="Kegiatan" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error && !s.data) return <div className="page narrow"><PageHeader back title="Kegiatan" /><ErrorState error={s.error} onRetry={s.reload} /></div>;
  const k = s.data;
  const ikut = k.peserta.some((p) => p.warga_id === user.id);
  const selesai = parseDate(k.selesai) < new Date();
  const penuh = k.kuota && k.peserta.length >= k.kuota;
  const boleh = kelolaInfo(hak, k, gang);
  const target = labelSasaran(k, gang);
  async function toggle() {
    setBusy(true);
    try { if (ikut) await batalIkut(id, user.id); else await daftarIkut(id); toast.success(ikut ? 'Pendaftaran dibatalkan' : 'Anda terdaftar sebagai peserta'); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  async function hapus() {
    if (!(await confirm({ title: 'Hapus kegiatan?', text: 'Kegiatan dan daftar pesertanya akan dihapus.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusKegiatan(id); if (k.gambar_path) removeFile('konten', k.gambar_path).catch(() => {}); toast.success('Kegiatan dihapus'); nav('/kegiatan', { replace: true }); } catch (e) { toast.error(e); }
  }
  return (
    <div className="page narrow">
      <PageHeader back="/kegiatan" title="Detail kegiatan"
        actions={boleh && <><Button size="sm" variant="secondary" icon={Pencil} to={`/kegiatan/${id}/ubah`}>Ubah</Button><Button size="sm" variant="danger-soft" icon={Trash2} onClick={hapus}>Hapus</Button></>}
        mobileActions={boleh && <><IconButton icon={Pencil} label="Ubah" to={`/kegiatan/${id}/ubah`} /><IconButton icon={Trash2} label="Hapus" onClick={hapus} /></>} />
      <Card pad className="stack">
        {k.gambar_path && <StorageImage path={k.gambar_path} className="cover" alt="" />}
        <div className="post-meta">
          {selesai ? <Badge>Sudah lewat</Badge> : <Badge tone="brand">Akan datang</Badge>}
          {target && <Badge tone="gold">Khusus {target}</Badge>}
        </div>
        <h1 className="post-title">{k.judul}</h1>
        <div className="facts">
          <div className="fact"><span className="ico sm"><CalendarDays size={16} /></span><div><div className="k">Tanggal</div><div className="v">{tanggal(k.mulai, { hari: true })}</div></div></div>
          <div className="fact"><span className="ico sm"><Clock size={16} /></span><div><div className="k">Waktu</div><div className="v">{jam(k.mulai)}–{jam(k.selesai)} WIB</div></div></div>
          <div className="fact"><span className="ico sm"><MapPin size={16} /></span><div><div className="k">Lokasi</div><div className="v">{k.lokasi}</div></div></div>
          {k.perlu_daftar && <div className="fact"><span className="ico sm"><Users size={16} /></span><div><div className="k">Peserta</div><div className="v">{k.peserta.length}{k.kuota ? ` dari ${k.kuota}` : ''} terdaftar</div></div></div>}
        </div>
        {k.deskripsi && <p className="prose">{k.deskripsi}</p>}
        {k.perlu_daftar && !selesai && <Button size="lg" loading={busy} variant={ikut ? 'secondary' : 'primary'} disabled={!ikut && penuh} onClick={toggle}>{ikut ? 'Batal ikut' : penuh ? 'Kuota penuh' : 'Ikut kegiatan ini'}</Button>}
      </Card>
      {k.perlu_daftar && (
        <Card>
          <CardHead title={`Peserta (${k.peserta.length})`} />
          <CardBody>
            {k.peserta.length === 0 ? <EmptyState compact icon={Users} title="Belum ada peserta" /> : (
              <div className="rows">{k.peserta.map((p) => (
                <div className="rowi" key={p.warga_id}><Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={36} /><span className="rowi-main"><span className="rowi-title">{p.warga?.nama}</span><span className="rowi-sub">{alamat(p.warga)}</span></span></div>
              ))}</div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
