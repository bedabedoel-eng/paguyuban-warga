import { Link } from 'react-router-dom';
import { FolderArchive, Plus, FileText, Mail, Send, NotebookPen, Paperclip, Globe } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, EmptyState } from '../../components/ui';
import DaftarKartu from '../../components/data/DaftarKartu';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarDokumen } from '../../services/dokumen';
import { JENIS_DOKUMEN } from '../../lib/constants';
import { tanggal } from '../../lib/format';

export const IKON_DOK = { surat_masuk: Mail, surat_keluar: Send, notulen: NotebookPen, lainnya: FileText };

const CARI = { placeholder: 'Cari judul, nomor, atau pihak', ambil: (d) => `${d.judul} ${d.nomor || ''} ${d.pihak || ''}` };
const FILTER_JENIS = [{
  key: 'jenis', label: 'Jenis dokumen', chips: true, semuaLabel: 'Semua',
  options: Object.entries(JENIS_DOKUMEN).map(([value, v]) => ({ value, label: v.label })),
  test: (d, v) => d.jenis === v,
}];
const URUTAN = [
  { key: 'baru', label: 'Terbaru', sort: (d) => d.tanggal, dir: 'desc' },
  { key: 'lama', label: 'Terlama', sort: (d) => d.tanggal, dir: 'asc' },
  { key: 'judul', label: 'Judul A–Z', sort: (d) => d.judul, dir: 'asc' },
];
const URUTAN_PENGURUS = [...URUTAN, { key: 'jenis', label: 'Jenis dokumen', sort: (d) => `${JENIS_DOKUMEN[d.jenis]?.label || ''} ${d.tanggal}`, dir: 'asc' }];
const ambil = () => daftarDokumen({ limit: 500 });

export default function Administrasi() {
  const { hak } = useAuth();
  const s = useAsync(ambil, []);
  const pengurus = hak.pengurus;
  const tombol = hak.kelola_dokumen && <Button size="sm" icon={Plus} to="/administrasi/baru">Arsipkan dokumen</Button>;
  return (
    <div className="page narrow">
      <PageHeader title={pengurus ? 'Surat & notulen' : 'Notulen rapat'}
        desc={pengurus ? 'Arsip administrasi paguyuban: surat masuk, surat keluar, dan notulen rapat.' : 'Notulen dan dokumen yang dibagikan pengurus kepada warga.'}
        actions={tombol} />
      <DaftarKartu rows={s.data} loading={s.loading} error={s.error} onRetry={s.reload} satuan="dokumen" bungkus="daftar"
        cari={CARI} filters={pengurus ? FILTER_JENIS : []} urutan={pengurus ? URUTAN_PENGURUS : URUTAN} defaultUrutan="baru"
        kosong={<EmptyState icon={FolderArchive} title="Belum ada dokumen"
          text={hak.kelola_dokumen ? 'Arsipkan surat dan notulen agar mudah dicari kembali oleh pengurus.' : 'Dokumen yang dibagikan pengurus akan tampil di sini.'} action={tombol} />}
        renderItem={(d) => {
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
        }} />
      {hak.kelola_dokumen && <Link to="/administrasi/baru" className="fab"><Plus size={20} />Arsipkan</Link>}
    </div>
  );
}
