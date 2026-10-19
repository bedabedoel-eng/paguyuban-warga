import { useMemo, useRef, useState } from 'react';
import { Download, FileUp, CircleCheck } from 'lucide-react';
import { Badge, Button, Callout, DataTable, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { parseCsv, toCsv, unduhBerkas } from '../../lib/csv';
import { simpanBlok, simpanGang } from '../../services/pengaturan';
import { pesanError } from '../../lib/errors';

const ALIAS = {
  blok: ['blok', 'kode blok', 'kode_blok', 'block'],
  nama_blok: ['nama_blok', 'nama blok', 'nama'],
  gang: ['jalan', 'gang', 'gang/jalan', 'gang / jalan', 'nama jalan', 'nama_jalan', 'jl'],
};
const CONTOH = [
  { blok: 'A', nama_blok: 'Blok A', gang: 'Jl. Melati' },
  { blok: 'A', nama_blok: 'Blok A', gang: 'Jl. Mawar' },
  { blok: 'C', nama_blok: 'Blok C', gang: 'Jl. Zamrud' },
  { blok: 'C', nama_blok: 'Blok C', gang: 'Jl. Safir' },
  { blok: '', nama_blok: '', gang: 'Jl. Utama (lintas blok)' },
];
export const KOLOM_WILAYAH = [{ key: 'blok', label: 'blok' }, { key: 'nama_blok', label: 'nama_blok' }, { key: 'gang', label: 'jalan' }];

/** Ubah isi CSV menjadi rencana: blok baru, gang baru, sudah ada, atau galat. */
function rencana(rows, blokAda, gangAda, boleBuatBlok) {
  const [header, ...data] = rows;
  const norm = header.map((h) => String(h).trim().toLowerCase());
  const idx = Object.fromEntries(Object.entries(ALIAS).map(([k, names]) => [k, norm.findIndex((h) => names.includes(h))]));
  if (idx.gang < 0) return { kurang: ['jalan'], list: [] };
  const kodeAda = new Set(blokAda.map((b) => b.kode));
  const barisBlokBaru = new Map(); // kode -> nama
  const kunciGang = new Set(gangAda.map((g) => `${g.blok || ''}|${g.nama.trim().toLowerCase()}`));
  const list = data.map((r, n) => {
    const ambil = (k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
    const kode = ambil('blok').toUpperCase();
    const nama = ambil('nama_blok');
    const gang = ambil('gang');
    const out = { baris: n + 2, blok: kode, nama_blok: nama, gang, aksi: [], galat: '' };
    if (kode && !/^[A-Z0-9]{1,5}$/.test(kode)) { out.galat = 'Kode blok: huruf/angka, maks. 5 karakter'; return out; }
    if (!kode && !gang) { out.galat = 'Baris kosong'; return out; }
    if (gang && (gang.length < 2 || gang.length > 60)) { out.galat = 'Nama jalan 2–60 karakter'; return out; }
    if (kode && !kodeAda.has(kode) && !barisBlokBaru.has(kode)) {
      if (!boleBuatBlok) { out.galat = `Blok ${kode} belum ada. Minta admin menambahkannya`; return out; }
      barisBlokBaru.set(kode, nama || `Blok ${kode}`);
      out.aksi.push('blok');
    }
    if (gang) {
      const k = `${kode}|${gang.toLowerCase()}`;
      if (kunciGang.has(k)) out.aksi.push('ada');
      else { kunciGang.add(k); out.aksi.push('gang'); }
    }
    return out;
  });
  return { kurang: [], list, blokBaru: [...barisBlokBaru].map(([kode, nama]) => ({ kode, nama })) };
}

/** Impor daftar blok & jalan dari CSV. Blok baru hanya dapat dibuat admin. */
export default function ImportWilayah({ open, onClose }) {
  const { hak } = useAuth();
  const { blok, gang, reload } = useSettings();
  const toast = useToast();
  const ref = useRef(null);
  const [nama, setNama] = useState('');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState(null);

  const baruGang = useMemo(() => plan?.list.filter((x) => x.aksi.includes('gang')) || [], [plan]);
  const baruBlok = plan?.blokBaru || [];
  const galat = plan?.list.filter((x) => x.galat) || [];
  const tutup = () => { setPlan(null); setNama(''); setHasil(null); onClose(); };

  async function pilih(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setHasil(null);
    if (!file) return;
    if (file.size > 1024 * 1024) return toast.error('Berkas terlalu besar (maks. 1 MB)');
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setPlan(null); return toast.error('Berkas kosong atau bukan CSV'); }
    setNama(file.name);
    setPlan(rencana(rows, blok, gang, hak.admin));
  }

  async function terapkan() {
    setBusy(true);
    let b = 0; let g = 0;
    try {
      let urut = blok.reduce((a, x) => Math.max(a, x.urutan || 0), 0);
      for (const x of baruBlok) { await simpanBlok({ kode: x.kode, nama: x.nama.slice(0, 40), urutan: ++urut }); b++; }
      let urutGang = gang.length;
      for (const x of baruGang) { await simpanGang({ nama: x.gang, blok: x.blok || null, urutan: ++urutGang }); g++; }
      await reload();
      setHasil({ b, g });
      setPlan(null);
      toast.success(`${g} jalan${b ? ` dan ${b} blok` : ''} ditambahkan`);
    } catch (e) {
      toast.error(pesanError(e));
      if (b || g) { await reload(); setHasil({ b, g, terhenti: true }); setPlan(null); }
    } finally { setBusy(false); }
  }

  const cols = [
    { key: 'baris', label: 'Baris', sort: (x) => x.baris, render: (x) => <span className="num muted">{x.baris}</span> },
    { key: 'blok', label: 'Blok', sort: (x) => x.blok, render: (x) => <span className="cell-main">{x.blok || 'Lintas blok'}</span> },
    { key: 'gang', label: 'Jalan', sort: (x) => x.gang, render: (x) => x.gang || <span className="muted">—</span> },
    { key: 'st', label: 'Hasil', sort: (x) => (x.galat ? 0 : x.aksi.includes('gang') ? 1 : 2), render: (x) => (x.galat ? <Badge tone="bad">{x.galat}</Badge>
      : <span className="row wrap" style={{ gap: 6, justifyContent: 'inherit' }}>{x.aksi.includes('blok') && <Badge tone="info">Blok baru</Badge>}{x.aksi.includes('gang') ? <Badge tone="ok">Jalan baru</Badge> : x.aksi.includes('ada') ? <Badge>Sudah ada</Badge> : null}</span>) },
  ];

  return (
    <Modal open={open} onClose={tutup} title="Impor blok & jalan" desc="Tambahkan banyak jalan sekaligus dari berkas CSV." wide
      footer={<><Button variant="secondary" onClick={tutup}>Tutup</Button>{plan && <Button loading={busy} disabled={!baruGang.length && !baruBlok.length} onClick={terapkan}>Tambahkan {baruGang.length} jalan{baruBlok.length ? ` & ${baruBlok.length} blok` : ''}</Button>}</>}>
      <div className="stack">
        <p className="text-sm ink-2">Kolom: <b>blok</b> (kode, mis. C), <b>nama_blok</b> (opsional), dan <b>jalan</b>. Kosongkan blok untuk jalan yang melintasi beberapa blok. Jalan yang sudah ada dilewati, tidak ada data yang dihapus atau diubah.</p>
        {!hak.admin && <Callout tone="info">Anda dapat menambah jalan pada blok yang sudah ada. Blok baru hanya dapat dibuat admin.</Callout>}
        <div className="row wrap">
          <Button size="sm" variant="secondary" icon={Download} onClick={() => unduhBerkas('contoh-import-blok-gang.csv', toCsv(CONTOH, KOLOM_WILAYAH))}>Unduh contoh CSV</Button>
          <input ref={ref} type="file" accept=".csv,text/csv,text/plain" onChange={pilih} hidden />
          <Button size="sm" icon={FileUp} onClick={() => ref.current?.click()}>Pilih berkas CSV</Button>
          {nama && <span className="text-sm muted">{nama}</span>}
        </div>
        {plan?.kurang.length > 0 && <Callout tone="bad">Kolom wajib tidak ditemukan: <b>{plan.kurang.join(', ')}</b>. Periksa baris judul berkas.</Callout>}
        {plan && !plan.kurang.length && (
          <>
            <div className="row wrap">
              <Badge tone="ok">{baruGang.length} jalan baru</Badge>
              {baruBlok.length > 0 && <Badge tone="info">{baruBlok.length} blok baru</Badge>}
              {galat.length > 0 && <Badge tone="bad">{galat.length} baris bermasalah</Badge>}
            </div>
            <div className="card flush"><DataTable columns={cols} rows={plan.list.slice(0, 200)} rowKey="baris" caption="Pratinjau impor blok dan jalan" /></div>
            {plan.list.length > 200 && <p className="text-sm muted">Menampilkan 200 dari {plan.list.length} baris.</p>}
          </>
        )}
        {hasil && (
          <Callout tone={hasil.terhenti ? 'warn' : 'ok'} icon={CircleCheck}>
            {hasil.g} jalan{hasil.b ? ` dan ${hasil.b} blok` : ''} berhasil ditambahkan.{hasil.terhenti ? ' Proses terhenti di tengah; impor ulang berkas yang sama akan melewati yang sudah masuk.' : ''}
          </Callout>
        )}
      </div>
    </Modal>
  );
}
