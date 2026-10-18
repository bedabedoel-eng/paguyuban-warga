import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderArchive, Plus, FileText, Mail, Send, NotebookPen, Paperclip, Globe } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Chips, SearchInput, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { daftarDokumen } from '../../services/dokumen';
import { JENIS_DOKUMEN } from '../../lib/constants';
import { tanggal } from '../../lib/format';

export const IKON_DOK = { surat_masuk: Mail, surat_keluar: Send, notulen: NotebookPen, lainnya: FileText };

export default function Administrasi() {
  const { hak } = useAuth();
  const [jenis, setJenis] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const s = useAsync(() => daftarDokumen({ jenis, q: dq }), [jenis, dq]);
  const pengurus = hak.pengurus;
  return (
    <div className="page narrow">
      <PageHeader title={pengurus ? 'Surat & notulen' : 'Notulen rapat'}
        desc={pengurus ? 'Arsip administrasi paguyuban: surat masuk, surat keluar, dan notulen rapat.' : 'Notulen dan dokumen yang dibagikan pengurus kepada warga.'}
        actions={hak.kelola_dokumen && <Button size="sm" icon={Plus} to="/administrasi/baru">Arsipkan dokumen</Button>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul dokumen" />
      </div>
      {pengurus && <Chips value={jenis} onChange={setJenis} tabs={[{ value: '', label: 'Semua' }, ...Object.entries(JENIS_DOKUMEN).map(([value, v]) => ({ value, label: v.label }))]} />}
      <Card>
        <CardBody>
          {s.loading && !s.data ? <SkeletonRows n={4} /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
            <EmptyState icon={FolderArchive} title={dq ? 'Dokumen tidak ditemukan' : 'Belum ada dokumen'}
              text={hak.kelola_dokumen ? 'Arsipkan surat dan notulen agar mudah dicari kembali oleh pengurus.' : 'Dokumen yang dibagikan pengurus akan tampil di sini.'}
              action={hak.kelola_dokumen && !dq && <Button size="sm" icon={Plus} to="/administrasi/baru">Arsipkan dokumen</Button>} />
          ) : (
            <div className="rows">
              {s.data.map((d) => {
                const J = JENIS_DOKUMEN[d.jenis]; const Icon = IKON_DOK[d.jenis];
                return (
                  <Link key={d.id} to={`/administrasi/${d.id}`} className="rowi">
                    <span className={`ico doc-ico ${J.tone || 'neutral'}`}><Icon size={18} /></span>
                    <span className="rowi-main">
                      <span className="rowi-title">{d.judul}</span>
                      <span className="rowi-sub">{J.label}{d.nomor ? ` · No. ${d.nomor}` : ''} · {tanggal(d.tanggal, { pendek: true })}{d.pihak ? ` · ${d.pihak}` : ''}</span>
                    </span>
                    <span className="rowi-end">
                      {d.lampiran_path && <Paperclip size={15} className="muted" aria-label="Ada lampiran" />}
                      {d.publik && pengurus && <Badge tone="info"><Globe size={12} />Dibagikan</Badge>}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
      {hak.kelola_dokumen && <Link to="/administrasi/baru" className="fab"><Plus size={20} />Arsipkan</Link>}
    </div>
  );
}
