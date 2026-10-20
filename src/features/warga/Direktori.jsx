import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Download, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, FotoWarga, IconButton, SearchInput, Select, SegTabs, Chips, SkeletonRows, SortSelect } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { daftarWarga, filterDirektori, semuaWarga } from '../../services/warga';
import { eksporWarga } from '../../lib/eksporWarga';
import { urutkan } from '../../lib/sort';

const SIMPAN = 'direktori_tampilan';
const bacaTampilan = () => { try { return localStorage.getItem(SIMPAN) === 'daftar' ? 'daftar' : 'foto'; } catch { return 'foto'; } };

const URUTAN = [
  { value: 'wilayah', label: 'Per blok & jalan' },
  { value: 'nama', label: 'Nama A–Z' },
  { value: 'nama_z', label: 'Nama Z–A' },
  { value: 'rumah', label: 'Nomor rumah' },
  { value: 'baru', label: 'Terbaru bergabung' },
  { value: 'lama', label: 'Terlama bergabung' },
];

function Kartu({ w, alamatPendek }) {
  const peran = w.role === 'admin' ? 'Admin' : w.role !== 'warga' ? 'Pengurus' : null;
  return (
    <Link to={`/warga/${w.id}`} className="dir-card" aria-label={`${w.nama}, ${alamatPendek(w)}`}>
      <FotoWarga nama={w.nama} path={w.foto_path} />
      {peran && <span className="tag"><ShieldCheck size={12} aria-hidden="true" />{peran}</span>}
      <span className="cap">
        <span className="nm">{w.nama}</span>
        <span className="al">{alamatPendek(w) || 'Alamat belum diisi'}</span>
        {w.pekerjaan && <span className="kj">{w.pekerjaan}</span>}
      </span>
    </Link>
  );
}

function BarisDaftar({ w, alamatPendek }) {
  return (
    <Link to={`/warga/${w.id}`} className="card person">
      <Avatar nama={w.nama} path={w.foto_path} size={48} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="nm ellipsis" style={{ display: 'block' }}>{w.nama}</span>
        <span className="mt ellipsis" style={{ display: 'block' }}>{alamatPendek(w)}{w.pekerjaan ? ` · ${w.pekerjaan}` : ''}</span>
      </span>
      {w.role !== 'warga' && <Badge tone="gold">{w.role === 'admin' ? 'Admin' : 'Pengurus'}</Badge>}
    </Link>
  );
}

export default function Direktori({ tertanam = false }) {
  const { hak } = useAuth();
  const { blok, gang, namaGang, alamatPendek } = useSettings();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [fw, setFw] = useState(''); // '' | 'b:C' | 'g:<id>'
  const [fk, setFk] = useState('');
  const [urut, setUrut] = useState('wilayah');
  const [tampil, setTampil] = useState(bacaTampilan);
  const [mengekspor, setMengekspor] = useState(false);
  useEffect(() => { try { localStorage.setItem(SIMPAN, tampil); } catch { /* abaikan */ } }, [tampil]);
  const dq = useDebounce(q.trim(), 300);
  const opsi = useAsync(filterDirektori, []);
  const filter = fw.startsWith('g:') ? { gang: fw.slice(2) } : fw.startsWith('b:') ? { blok: fw.slice(2) } : {};
  const list = useAsync(() => daftarWarga({ q: dq, pekerjaan: fk, ...filter }), [dq, fw, fk]);
  const bisaEkspor = hak.kelola_anggota || hak.humas;

  const urutGang = (id) => { const i = gang.findIndex((g) => g.id === id); return i < 0 ? 999 : i; };
  const data = useMemo(() => {
    const d = list.data || [];
    switch (urut) {
      case 'nama_z': return urutkan(d, (w) => w.nama, 'desc');
      case 'rumah': return urutkan(d, (w) => `${w.blok || '~'} ${w.no_rumah || ''}`);
      case 'baru': return urutkan(d, (w) => w.bergabung_at, 'desc');
      case 'lama': return urutkan(d, (w) => w.bergabung_at, 'asc');
      default: return urutkan(d, (w) => w.nama);
    }
  }, [list.data, urut]);
  // Per blok, lalu per jalan di dalam blok (hanya saat urutan "Per blok & jalan")
  const grup = useMemo(() => {
    if (urut !== 'wilayah') return null;
    const m = new Map();
    for (const w of data) {
      const k = `${w.blok || '-'}|${w.gang_id || ''}`;
      if (!m.has(k)) m.set(k, { blok: w.blok, gang: w.gang_id, rows: [] });
      m.get(k).rows.push(w);
    }
    return [...m.values()].sort((a, b) => (a.blok || '~').localeCompare(b.blok || '~') || urutGang(a.gang) - urutGang(b.gang));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, urut, gang]);
  const judulGrup = (g) => [g.blok ? (blok.find((b) => b.kode === g.blok)?.nama || `Blok ${g.blok}`) : 'Belum ada blok', namaGang(g.gang)].filter(Boolean).join(' · ');
  const chipBlok = fw.startsWith('b:') ? fw.slice(2) : fw.startsWith('g:') ? (gang.find((g) => g.id === fw.slice(2))?.blok || '') : '';
  const opsiJalan = gang.filter((g) => !chipBlok || !g.blok || g.blok === chipBlok).map((g) => ({ value: `g:${g.id}`, label: g.nama }));
  const adaFilter = !!(dq || fw || fk);

  async function ekspor() {
    setMengekspor(true);
    try {
      let rows = await semuaWarga({ status: 'aktif', q: dq, ...filter });
      if (fk) rows = rows.filter((w) => w.pekerjaan === fk);
      if (!rows.length) return toast.error('Tidak ada data untuk diekspor');
      const n = eksporWarga(urutkan(rows, (w) => `${w.blok || '~'} ${w.no_rumah || ''}`), gang);
      toast.success(`${n} warga diekspor ke CSV${adaFilter ? ' (sesuai filter)' : ''}`);
    } catch (e) { toast.error(e); } finally { setMengekspor(false); }
  }

  const render = (rows) => (tampil === 'foto'
    ? <div className="dir-grid">{rows.map((w) => <Kartu key={w.id} w={w} alamatPendek={alamatPendek} />)}</div>
    : <div className="people">{rows.map((w) => <BarisDaftar key={w.id} w={w} alamatPendek={alamatPendek} />)}</div>);

  return (
    <div className={tertanam ? 'stack' : 'page'}>
      {tertanam
        ? (bisaEkspor && <div className="row wrap" style={{ justifyContent: 'flex-end' }}><Button size="sm" variant="secondary" icon={Download} loading={mengekspor} onClick={ekspor}>Ekspor CSV</Button></div>)
        : <PageHeader title="Direktori warga" desc="Kenali tetangga. Nomor HP hanya tampil bila pemiliknya mengizinkan."
            actions={bisaEkspor ? <Button size="sm" variant="secondary" icon={Download} loading={mengekspor} onClick={ekspor}>Ekspor CSV</Button> : undefined}
            mobileActions={bisaEkspor ? <IconButton icon={Download} label="Ekspor CSV" onClick={ekspor} /> : undefined} />}
      <div className="dir-tools">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama warga" label="Cari nama warga" />
        <Chips label="Filter blok" value={chipBlok} onChange={(v) => setFw(v ? `b:${v}` : '')}
          tabs={[{ value: '', label: 'Semua blok' }, ...blok.map((b) => ({ value: b.kode, label: b.nama }))]} />
        <div className="toolbar">
          <Select className="sm" placeholder="Semua jalan" value={fw.startsWith('g:') ? fw : ''} onChange={(e) => setFw(e.target.value || (chipBlok ? `b:${chipBlok}` : ''))} options={opsiJalan} aria-label="Filter jalan" />
          <Select className="sm" placeholder="Semua pekerjaan" value={fk} onChange={(e) => setFk(e.target.value)} options={opsi.data?.pekerjaan || []} aria-label="Filter pekerjaan" />
          <SortSelect value={urut} onChange={setUrut} options={URUTAN} />
        </div>
      </div>
      <div className="row between wrap">
        <span className="dir-count" aria-live="polite">{list.data ? `${list.data.length} warga${adaFilter ? ' sesuai filter' : ' aktif'}` : ' '}</span>
        <SegTabs value={tampil} onChange={setTampil} label="Tampilan direktori" tabs={[{ value: 'foto', label: 'Foto' }, { value: 'daftar', label: 'Daftar' }]} />
      </div>
      {list.loading && !list.data ? <Card pad><SkeletonRows n={6} /></Card> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !data.length ? (
        <Card><EmptyState icon={Users} title="Warga tidak ditemukan" text="Coba kata kunci lain atau hapus filter."
          action={adaFilter ? <Button size="sm" variant="secondary" onClick={() => { setQ(''); setFw(''); setFk(''); }}>Hapus filter</Button> : undefined} /></Card>
      ) : grup ? grup.map((g) => (
        <section key={`${g.blok}|${g.gang}`} className="stack-sm dir-sec" aria-label={judulGrup(g)}>
          <div className="section-head"><h2>{judulGrup(g)}</h2><span className="dir-n">{g.rows.length} warga</span></div>
          {render(g.rows)}
        </section>
      )) : render(data)}
    </div>
  );
}
