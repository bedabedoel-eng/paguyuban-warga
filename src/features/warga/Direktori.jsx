import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Card, Select, SearchInput, EmptyState, ErrorState, SkeletonRows } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { daftarWarga, filterDirektori } from '../../services/warga';

export default function Direktori() {
  const { blok } = useSettings();
  const [q, setQ] = useState('');
  const [fb, setFb] = useState('');
  const [fk, setFk] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const opsi = useAsync(filterDirektori, []);
  const list = useAsync(() => daftarWarga({ q: dq, blok: fb, pekerjaan: fk }), [dq, fb, fk]);
  const grup = useMemo(() => {
    const m = new Map();
    for (const w of list.data || []) { const k = w.blok || '-'; if (!m.has(k)) m.set(k, []); m.get(k).push(w); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [list.data]);
  const namaBlok = (k) => blok.find((b) => b.kode === k)?.nama || `Blok ${k}`;

  return (
    <div className="page">
      <PageHeader title="Direktori warga" desc="Kenali tetangga. Nomor HP hanya tampil bila pemiliknya mengizinkan." />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama warga" label="Cari nama warga" />
        <Select className="sm" placeholder="Semua gang" value={fb} onChange={(e) => setFb(e.target.value)} options={blok.map((b) => ({ value: b.kode, label: b.nama }))} aria-label="Filter gang" />
        <Select className="sm" placeholder="Semua pekerjaan" value={fk} onChange={(e) => setFk(e.target.value)} options={opsi.data?.pekerjaan || []} aria-label="Filter pekerjaan" />
      </div>
      {list.loading && !list.data ? <Card pad><SkeletonRows n={6} /></Card> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data?.length ? (
        <Card><EmptyState icon={Users} title="Warga tidak ditemukan" text="Coba kata kunci lain atau hapus filter." /></Card>
      ) : grup.map(([k, rows]) => (
        <section key={k} className="stack-sm" aria-label={namaBlok(k)}>
          <div className="section-head"><h2>{namaBlok(k)}</h2><span className="text-sm muted">{rows.length} warga</span></div>
          <div className="people">
            {rows.map((w) => (
              <Link key={w.id} to={`/warga/${w.id}`} className="card person">
                <Avatar nama={w.nama} path={w.foto_path} size={48} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="nm ellipsis" style={{ display: 'block' }}>{w.nama}</span>
                  <span className="mt ellipsis" style={{ display: 'block' }}>No. {w.no_rumah}{w.pekerjaan ? ` · ${w.pekerjaan}` : ''}</span>
                </span>
                {w.role !== 'warga' && <Badge tone="gold">{w.role === 'admin' ? 'Admin' : 'Pengurus'}</Badge>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
