import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, ErrorState, Loader, StorageImage, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailPengumuman, hapusPengumuman } from '../../services/pengumuman';
import { removeFile } from '../../lib/storage';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';
import { tanggalJam } from '../../lib/format';

export default function DetailPengumuman() {
  const { id } = useParams();
  const { hak } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const s = useAsync(() => detailPengumuman(id), [id]);
  if (s.loading && !s.data) return <><PageHeader title="Pengumuman" /><Loader /></>;
  if (s.error && !s.data) return <><PageHeader title="Pengumuman" /><div className="page"><ErrorState error={s.error} /></div></>;
  const p = s.data;
  const k = KATEGORI_PENGUMUMAN[p.kategori];
  async function hapus() {
    if (!(await confirm({ title: 'Hapus pengumuman?', text: 'Pengumuman ini akan dihapus permanen.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusPengumuman(id); if (p.gambar_path) removeFile('konten', p.gambar_path).catch(() => {}); toast.success('Pengumuman dihapus'); nav('/pengumuman', { replace: true }); } catch (e) { toast.error(e); }
  }
  return (
    <>
      <PageHeader title="Pengumuman" actions={hak.pengurus && (<><Button size="sm" variant="outline" icon={Pencil} to={`/pengumuman/${id}/ubah`}>Ubah</Button><Button size="sm" variant="danger-outline" icon={Trash2} onClick={hapus}>Hapus</Button></>)} mobileActions={hak.pengurus && <button className="icon-btn" onClick={hapus} aria-label="Hapus"><Trash2 size={20} /></button>} />
      <div className="page" style={{ maxWidth: 820 }}>
        <Card pad className="stack">
          {p.gambar_path && <div style={{ borderRadius: 12, overflow: 'hidden' }}><StorageImage path={p.gambar_path} className="post-cover" /></div>}
          <div className="row"><Badge tone={k?.tone}>{k?.label}</Badge><span className="small muted">{tanggalJam(p.created_at)}{p.penulis?.nama ? ` • ${p.penulis.nama}` : ''}</span></div>
          <h1>{p.judul}</h1>
          <p className="post-body">{p.isi}</p>
          {hak.pengurus && <Button variant="outline" size="sm" to={`/pengumuman/${id}/ubah`} className="mobile-only">Ubah pengumuman</Button>}
        </Card>
      </div>
    </>
  );
}
