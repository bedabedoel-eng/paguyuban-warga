import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Select, EmptyState, Loader, ErrorState } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { daftarWarga, filterDirektori } from '../../services/warga';

export default function Direktori() {
  const { blok } = useSettings();
  const [q, setQ] = useState('');
  const [fb, setFb] = useState('');
  const [fn, setFn] = useState('');
  const [fk, setFk] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const opsi = useAsync(filterDirektori, []);
  const list = useAsync(() => daftarWarga({ q: dq, blok: fb, noRumah: fn, pekerjaan: fk }), [dq, fb, fn, fk]);
  const nomor = useMemo(() => (opsi.data?.rows || []).filter((r) => !fb || r.blok === fb).map((r) => r.no_rumah), [opsi.data, fb]);
  const nomorUniq = useMemo(() => [...new Set(nomor.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true })), [nomor]);
  useEffect(() => { setFn(''); }, [fb]);

  return (
    <>
      <PageHeader title="Direktori Warga" back={false} />
      <div className="page">
        <div className="page-inner">
          <div className="input-icon">
            <Search size={18} />
            <input className="input" type="search" placeholder="Cari nama..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama warga" />
          </div>
          <div className="filters">
            <Select className="sm" placeholder="Semua Blok" value={fb} onChange={(e) => setFb(e.target.value)} options={blok.map((b) => ({ value: b.kode, label: b.nama }))} fieldClass="grow" />
            <Select className="sm" placeholder="Semua No." value={fn} onChange={(e) => setFn(e.target.value)} options={nomorUniq} fieldClass="grow" />
            <Select className="sm" placeholder="Semua Keahlian" value={fk} onChange={(e) => setFk(e.target.value)} options={opsi.data?.pekerjaan || []} fieldClass="grow" />
          </div>
          {list.loading && !list.data ? <Loader /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data?.length ? (
            <EmptyState icon={Users} title="Warga tidak ditemukan" text="Coba ubah kata kunci atau filter." />
          ) : (
            <div className="grid-cards">
              {list.data.map((w) => (
                <Link key={w.id} to={`/warga/${w.id}`} className="card person-card">
                  <Avatar nama={w.nama} path={w.foto_path} size={72} />
                  <span className="nm">{w.nama}</span>
                  <span className="meta">{w.blok}-{w.no_rumah}<br />{w.pekerjaan || ' '}</span>
                </Link>
              ))}
            </div>
          )}
          {list.data && <p className="small muted center">{list.data.length} warga</p>}
        </div>
      </div>
    </>
  );
}
