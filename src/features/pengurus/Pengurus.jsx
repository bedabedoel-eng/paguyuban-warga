import { Link } from 'react-router-dom';
import { UsersRound, Network } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Button, Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengurus } from '../../services/pengurus';
import { PERAN_PENGURUS, labelJabatan } from '../../lib/akses';
import { useSettings } from '../../context/SettingsContext';

export function kelompokkan(rows) {
  const urut = (p) => PERAN_PENGURUS[p.peran]?.urut ?? 9;
  const sorted = [...rows].sort((a, b) => urut(a) - urut(b) || (a.warga?.blok || '').localeCompare(b.warga?.blok || '') || a.urutan - b.urutan);
  return {
    inti: sorted.filter((p) => PERAN_PENGURUS[p.peran]?.inti ?? p.inti),
    humas: sorted.filter((p) => p.peran === 'humas'),
    seksi: sorted.filter((p) => !(PERAN_PENGURUS[p.peran]?.inti ?? p.inti) && p.peran !== 'humas'),
  };
}

function OrgCard({ p }) {
  const lead = p.peran === 'ketua';
  const { namaGang, alamatPendek } = useSettings();
  return (
    <Link to={`/warga/${p.warga_id}`} className={`card org-card ${lead ? 'lead' : ''}`}>
      <Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={48} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="jab" style={{ display: 'block' }}>{labelJabatan(p, namaGang)}</span>
        <span className="nm ellipsis" style={{ display: 'block' }}>{p.warga?.nama}</span>
        <span className="mt" style={{ display: 'block' }}>{alamatPendek(p.warga)}{p.periode_mulai ? ` · ${p.periode_mulai}–${p.periode_selesai || 'sekarang'}` : ''}</span>
      </span>
    </Link>
  );
}

export default function Pengurus() {
  const { hak } = useAuth();
  const s = useAsync(() => daftarPengurus(), []);
  const g = kelompokkan(s.data || []);
  return (
    <div className="page">
      <PageHeader title="Pengurus paguyuban" desc="Susunan pengurus periode berjalan. Ketuk nama untuk melihat kontak."
        actions={hak.kelola_pengurus && <Button size="sm" variant="secondary" icon={Network} to="/pengurus/kelola">Atur pengurus</Button>} />
      {s.loading && !s.data ? <Card pad><SkeletonRows n={4} /></Card> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? (
        <Card><EmptyState icon={UsersRound} title="Susunan pengurus belum diisi" text={hak.kelola_pengurus ? 'Mulai dengan menetapkan Ketua, Sekretaris, dan Bendahara.' : 'Pengurus akan tampil setelah ditetapkan.'}
          action={hak.kelola_pengurus && <Button size="sm" to="/pengurus/kelola">Atur pengurus</Button>} /></Card>
      ) : (
        <>
          {g.inti.length > 0 && <section className="stack-sm"><h2>Pengurus inti</h2><div className="org">{g.inti.map((p) => <OrgCard key={p.id} p={p} />)}</div></section>}
          {g.humas.length > 0 && <section className="stack-sm"><h2>Humas gang</h2><div className="org">{g.humas.map((p) => <OrgCard key={p.id} p={p} />)}</div></section>}
          {g.seksi.length > 0 && <section className="stack-sm"><h2>Seksi & anggota pengurus</h2><div className="org">{g.seksi.map((p) => <OrgCard key={p.id} p={p} />)}</div></section>}
        </>
      )}
    </div>
  );
}
