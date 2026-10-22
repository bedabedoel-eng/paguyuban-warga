import { useMemo, useState } from 'react';
import { Check, SearchX, UserRound, X } from 'lucide-react';
import { Avatar, Badge, Button, Chips, SearchInput, Select, SkeletonRows } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useDebounce } from '../../hooks/useDebounce';

const MAKS = 60;

/**
 * Pemilih warga aktif untuk form Tetapkan pengurus: cari (nama, rumah, pekerjaan), saring per blok & jalan,
 * daftar berfoto dengan alamat dan jabatan yang sudah dipegang. Setelah memilih tampil ringkas + tombol Ganti.
 *
 * warga     daftar warga aktif (null = sedang dimuat)
 * jabatan   { [warga_id]: ['Ketua', ...] } jabatan aktif yang sudah dipegang
 * value     warga_id terpilih
 */
export default function PilihWarga({ warga, jabatan = {}, value, onChange, error, terkunci }) {
  const { blok, gang, namaGang, alamatPendek } = useSettings();
  const [q, setQ] = useState('');
  const [fb, setFb] = useState('');
  const [fg, setFg] = useState('');
  const [buka, setBuka] = useState(!value);
  const dq = useDebounce(q.trim().toLowerCase(), 150);

  const hasil = useMemo(() => {
    const kata = dq.split(/\s+/).filter(Boolean);
    return (warga || []).filter((w) => {
      if (fb && w.blok !== fb) return false;
      if (fg && w.gang_id !== fg) return false;
      if (!kata.length) return true;
      const teks = `${w.nama} ${w.pekerjaan || ''} ${w.blok || ''}-${w.no_rumah || ''} ${w.blok || ''} ${w.no_rumah || ''} ${namaGang(w.gang_id) || ''}`.toLowerCase();
      return kata.every((k) => teks.includes(k));
    }).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [warga, dq, fb, fg, namaGang]);

  const terpilih = (warga || []).find((w) => w.id === value);
  const opsiJalan = gang.filter((g) => !fb || !g.blok || g.blok === fb).map((g) => ({ value: g.id, label: g.nama }));
  const pilih = (w) => { onChange(w.id); setBuka(false); };

  if (terpilih && (!buka || terkunci)) {
    return (
      <div className="pw-pilih">
        <span className="pw-label">Warga</span>
        <div className="pw-terpilih">
          <Avatar nama={terpilih.nama} path={terpilih.foto_path} size={52} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="pw-nm">{terpilih.nama}</div>
            <div className="pw-mt">{[alamatPendek(terpilih), terpilih.pekerjaan].filter(Boolean).join(' · ')}</div>
            {jabatan[terpilih.id]?.length > 0 && <div className="pw-jab">{jabatan[terpilih.id].map((j) => <Badge key={j} tone="gold">{j}</Badge>)}</div>}
          </div>
          {!terkunci && <Button size="sm" variant="secondary" onClick={() => setBuka(true)}>Ganti</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="pw-pilih">
      <div className="row between">
        <span className="pw-label">Pilih warga</span>
        {terpilih && <Button size="xs" variant="ghost" icon={X} onClick={() => setBuka(false)}>Batal ganti</Button>}
      </div>
      <div className="pw-alat">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama, rumah (C-3/5), atau pekerjaan" label="Cari warga" autoFocus />
        <div className="row wrap" style={{ gap: 8 }}>
          <Chips label="Saring blok" value={fb} onChange={(v) => { setFb(v); setFg(''); }}
            tabs={[{ value: '', label: 'Semua blok' }, ...blok.map((b) => ({ value: b.kode, label: b.nama }))]} />
          {opsiJalan.length > 0 && <Select className="sm" value={fg} onChange={(e) => setFg(e.target.value)} placeholder="Semua jalan" options={opsiJalan} aria-label="Saring jalan" />}
        </div>
      </div>
      <div className={`pw-daftar${error ? ' invalid' : ''}`} role="listbox" aria-label="Daftar warga aktif">
        {!warga ? <div style={{ padding: 12 }}><SkeletonRows n={4} /></div>
          : !hasil.length ? (
            <div className="pw-kosong"><SearchX size={22} aria-hidden="true" /><span>Tidak ada warga aktif yang cocok.</span>
              {(q || fb || fg) && <Button size="xs" variant="ghost" onClick={() => { setQ(''); setFb(''); setFg(''); }}>Hapus saringan</Button>}</div>
          ) : hasil.slice(0, MAKS).map((w) => {
            const aktif = w.id === value;
            return (
              <button key={w.id} type="button" role="option" aria-selected={aktif} className={`pw-item${aktif ? ' on' : ''}`} onClick={() => pilih(w)}>
                <Avatar nama={w.nama} path={w.foto_path} size={40} />
                <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                  <span className="pw-nm ellipsis">{w.nama}</span>
                  <span className="pw-mt ellipsis">{[alamatPendek(w), w.pekerjaan].filter(Boolean).join(' · ') || 'Alamat belum diisi'}</span>
                </span>
                {jabatan[w.id]?.length > 0 && <Badge tone="gold">{jabatan[w.id][0]}{jabatan[w.id].length > 1 ? ` +${jabatan[w.id].length - 1}` : ''}</Badge>}
                {aktif ? <Check size={18} className="t-ok" aria-hidden="true" /> : <UserRound size={16} className="pw-ico" aria-hidden="true" />}
              </button>
            );
          })}
      </div>
      <div className="row between text-xs muted">
        <span>{warga ? (hasil.length > MAKS ? `Menampilkan ${MAKS} dari ${hasil.length}. Persempit dengan cari atau saringan.` : `${hasil.length} warga aktif`) : 'Memuat warga…'}</span>
        {error && <span className="t-bad">{error}</span>}
      </div>
    </div>
  );
}
