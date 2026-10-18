import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Pencil, Trash2, Users } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, ErrorState, Loader, StorageImage, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailKegiatan, hapusKegiatan, daftarIkut, batalIkut } from '../../services/kegiatan';
import { removeFile } from '../../lib/storage';
import { jam, tanggal, parseDate } from '../../lib/format';
import { useState } from 'react';

export default function DetailKegiatan() {
  const { id } = useParams();
  const { user, hak } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const s = useAsync(() => detailKegiatan(id), [id]);
  if (s.loading && !s.data) return <><PageHeader title="Kegiatan" /><Loader /></>;
  if (s.error && !s.data) return <><PageHeader title="Kegiatan" /><div className="page"><ErrorState error={s.error} /></div></>;
  const k = s.data;
  const ikut = k.peserta.some((p) => p.warga_id === user.id);
  const selesai = parseDate(k.selesai) < new Date();
  const penuh = k.kuota && k.peserta.length >= k.kuota;
  async function toggle() {
    setBusy(true);
    try { if (ikut) await batalIkut(id, user.id); else await daftarIkut(id); toast.success(ikut ? 'Pendaftaran dibatalkan' : 'Berhasil mendaftar'); s.reload(); } catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  async function hapus() {
    if (!(await confirm({ title: 'Hapus kegiatan?', text: 'Kegiatan dan daftar pesertanya akan dihapus.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusKegiatan(id); if (k.gambar_path) removeFile('konten', k.gambar_path).catch(() => {}); toast.success('Kegiatan dihapus'); nav('/kegiatan', { replace: true }); } catch (e) { toast.error(e); }
  }
  return (
    <>
      <PageHeader title="Detail Kegiatan" actions={hak.pengurus && (<><Button size="sm" variant="outline" icon={Pencil} to={`/kegiatan/${id}/ubah`}>Ubah</Button><Button size="sm" variant="danger-outline" icon={Trash2} onClick={hapus}>Hapus</Button></>)} mobileActions={hak.pengurus && <button className="icon-btn" onClick={hapus} aria-label="Hapus"><Trash2 size={20} /></button>} />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="page-inner">
          <Card pad className="stack">
            {k.gambar_path && <div style={{ borderRadius: 12, overflow: 'hidden' }}><StorageImage path={k.gambar_path} className="post-cover" /></div>}
            <div className="row between"><h1>{k.judul}</h1>{selesai && <Badge>Selesai</Badge>}</div>
            <div className="stack sm">
              <div className="row"><CalendarDays size={18} className="green" />{tanggal(k.mulai, { hari: true })}</div>
              <div className="row"><Clock size={18} className="green" />{jam(k.mulai)} - {jam(k.selesai)} WIB</div>
              <div className="row"><MapPin size={18} className="green" />{k.lokasi}</div>
              <div className="row"><Users size={18} className="green" />{k.peserta.length} terdaftar{k.kuota ? ` dari ${k.kuota}` : ''}</div>
            </div>
            {k.deskripsi && <p className="post-body">{k.deskripsi}</p>}
            {k.perlu_daftar && !selesai && <Button block loading={busy} variant={ikut ? 'outline' : 'primary'} disabled={!ikut && penuh} onClick={toggle}>{ikut ? 'Batal Ikut' : penuh ? 'Kuota Penuh' : 'Daftar Kegiatan'}</Button>}
          </Card>
          {k.perlu_daftar && (
            <Card pad>
              <h2 className="mb-3">Peserta ({k.peserta.length})</h2>
              {k.peserta.length === 0 ? <p className="small muted">Belum ada peserta.</p> : (
                <div className="list">{k.peserta.map((p) => (
                  <div className="list-item" key={p.warga_id}><Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={36} /><span className="grow"><span className="title" style={{ display: 'block' }}>{p.warga?.nama}</span><span className="sub">{p.warga?.blok}-{p.warga?.no_rumah}</span></span></div>
                ))}</div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
