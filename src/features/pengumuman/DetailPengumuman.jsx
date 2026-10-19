import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, ErrorState, SkeletonRows, StorageImage, IconButton, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailPengumuman, hapusPengumuman } from '../../services/pengumuman';
import { removeFile } from '../../lib/storage';
import { KATEGORI_PENGUMUMAN } from '../../lib/constants';
import { kelolaInfo } from '../../lib/akses';
import { tanggalJam } from '../../lib/format';
import { labelSasaran } from '../../lib/alamat';
import { useSettings } from '../../context/SettingsContext';

export default function DetailPengumuman() {
  const { id } = useParams();
  const { hak } = useAuth();
  const { gang } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const s = useAsync(() => detailPengumuman(id), [id]);
  if (s.loading && !s.data) return <div className="page narrow"><PageHeader back title="Pengumuman" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error && !s.data) return <div className="page narrow"><PageHeader back title="Pengumuman" /><ErrorState error={s.error} onRetry={s.reload} /></div>;
  const p = s.data;
  const k = KATEGORI_PENGUMUMAN[p.kategori] || KATEGORI_PENGUMUMAN.umum;
  const boleh = kelolaInfo(hak, p, gang);
  const target = labelSasaran(p, gang);
  async function hapus() {
    if (!(await confirm({ title: 'Hapus pengumuman?', text: 'Pengumuman ini akan hilang dari daftar semua warga.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusPengumuman(id); if (p.gambar_path) removeFile('konten', p.gambar_path).catch(() => {}); toast.success('Pengumuman dihapus'); nav('/pengumuman', { replace: true }); } catch (e) { toast.error(e); }
  }
  return (
    <div className="page narrow">
      <PageHeader back="/pengumuman" title="Pengumuman"
        actions={boleh && <><Button size="sm" variant="secondary" icon={Pencil} to={`/pengumuman/${id}/ubah`}>Ubah</Button><Button size="sm" variant="danger-soft" icon={Trash2} onClick={hapus}>Hapus</Button></>}
        mobileActions={boleh && <><IconButton icon={Pencil} label="Ubah" to={`/pengumuman/${id}/ubah`} /><IconButton icon={Trash2} label="Hapus" onClick={hapus} /></>} />
      <Card pad className="stack">
        <div className="post-meta">
          <Badge tone={k.tone}>{k.label}</Badge>
          {target && <Badge tone="gold">Khusus {target}</Badge>}
          <span>{tanggalJam(p.created_at)}</span>
        </div>
        <h1 className="post-title">{p.judul}</h1>
        {p.ringkasan && <p className="ink-2" style={{ fontSize: 'var(--fs-lg)' }}>{p.ringkasan}</p>}
        {p.gambar_path && <StorageImage path={p.gambar_path} className="cover" alt="" />}
        <p className="prose">{p.isi}</p>
        {p.penulis?.nama && (
          <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <Avatar nama={p.penulis.nama} size={32} />
            <span className="text-sm"><span className="muted">Ditulis oleh</span> {p.penulis.nama}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
