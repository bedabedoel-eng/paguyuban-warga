import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2, Paperclip, ExternalLink, Globe, Lock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, ErrorState, SkeletonRows, IconButton, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { detailDokumen, hapusDokumen } from '../../services/dokumen';
import { signedUrl, removeFile } from '../../lib/storage';
import { JENIS_DOKUMEN } from '../../lib/constants';
import { tanggal, tanggalJam } from '../../lib/format';

export default function DetailDokumen() {
  const { id } = useParams();
  const { hak } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const nav = useNavigate();
  const s = useAsync(() => detailDokumen(id), [id]);
  if (s.loading && !s.data) return <div className="page narrow"><PageHeader back title="Dokumen" /><Card pad><SkeletonRows n={4} avatar={false} /></Card></div>;
  if (s.error && !s.data) return <div className="page narrow"><PageHeader back title="Dokumen" /><ErrorState error={s.error} onRetry={s.reload} /></div>;
  const d = s.data;
  const J = JENIS_DOKUMEN[d.jenis];
  async function buka() { const u = await signedUrl('bukti', d.lampiran_path); if (u) window.open(u, '_blank', 'noopener'); else toast.error('Lampiran tidak dapat dibuka'); }
  async function hapus() {
    if (!(await confirm({ title: 'Hapus dokumen?', text: `${d.judul} beserta lampirannya akan dihapus dari arsip.`, okLabel: 'Hapus', danger: true }))) return;
    try { await hapusDokumen(id); if (d.lampiran_path) removeFile('bukti', d.lampiran_path).catch(() => {}); toast.success('Dokumen dihapus'); nav('/administrasi', { replace: true }); } catch (e) { toast.error(e); }
  }
  const surat = d.jenis.startsWith('surat');
  return (
    <div className="page narrow">
      <PageHeader back="/administrasi" title={J.label}
        actions={hak.kelola_dokumen && <><Button size="sm" variant="secondary" icon={Pencil} to={`/administrasi/${id}/ubah`}>Ubah</Button><Button size="sm" variant="danger-soft" icon={Trash2} onClick={hapus}>Hapus</Button></>}
        mobileActions={hak.kelola_dokumen && <><IconButton icon={Pencil} label="Ubah" to={`/administrasi/${id}/ubah`} /><IconButton icon={Trash2} label="Hapus" onClick={hapus} /></>} />
      <Card pad className="stack">
        <div className="post-meta">
          <Badge tone={J.tone}>{J.label}</Badge>
          {hak.pengurus && (d.publik ? <Badge tone="info"><Globe size={12} />Dibagikan ke warga</Badge> : <Badge><Lock size={12} />Internal pengurus</Badge>)}
        </div>
        <h1 className="post-title">{d.judul}</h1>
        <dl className="kv" style={{ margin: 0 }}>
          {d.nomor && <><dt>Nomor</dt><dd className="num">{d.nomor}</dd></>}
          <dt>Tanggal</dt><dd>{tanggal(d.tanggal, { hari: true })}</dd>
          {d.pihak && <><dt>{surat ? (d.jenis === 'surat_masuk' ? 'Pengirim' : 'Tujuan') : 'Peserta / pihak'}</dt><dd>{d.pihak}</dd></>}
          {d.pembuat?.nama && <><dt>Diarsipkan oleh</dt><dd>{d.pembuat.nama} · {tanggalJam(d.created_at)}</dd></>}
        </dl>
        {d.isi && <p className="prose" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>{d.isi}</p>}
        {d.lampiran_path && <div><Button variant="secondary" icon={Paperclip} iconRight={ExternalLink} onClick={buka}>Buka lampiran</Button></div>}
      </Card>
    </div>
  );
}
