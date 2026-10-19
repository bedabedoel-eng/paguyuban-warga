import { useMemo, useRef, useState } from 'react';
import { Download, FileUp, CircleCheck } from 'lucide-react';
import { Badge, Button, Callout, DataTable, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { parseCsv, toCsv, unduhBerkas } from '../../lib/csv';
import { simpanBlok, simpanGang } from '../../services/pengaturan';
import { pesanError } from '../../lib/errors';
import { daftarNomorGang } from '../../lib/alamat';

const ALIAS = {
  blok: ['blok', 'kode blok', 'kode_blok', 'block'],
  nomor: ['nomor', 'no', 'no.', 'nomor rumah', 'no rumah', 'no_rumah', 'sub_blok', 'sub blok', 'sub-blok', 'kluster'],
  gang: ['jalan', 'gang', 'gang/jalan', 'gang / jalan', 'nama jalan', 'nama_jalan', 'jl'],
  nama_blok: ['nama_blok', 'nama blok'], // lama, opsional: nama untuk blok baru
};
const CONTOH = [
  { blok: 'A', nomor: '3', gang: 'Jl. Melati' },
  { blok: 'A', nomor: '4', gang: 'Jl. Melati' },
  { blok: 'A', nomor: '1', gang: 'Jl. Mawar' },
  { blok: 'C', nomor: '1-20', gang: 'Jl. Zamrud' },
  { blok: '', nomor: '', gang: 'Jl. Utama (lintas blok)' },
];
export const KOLOM_WILAYAH = [{ key: 'blok', label: 'blok' }, { key: 'nomor', label: 'nomor' }, { key: 'gang', label: 'jalan' }];
const POLA_TOKEN = /^[0-9A-Z]{1,6}(-[0-9A-Z]{1,6})?$/;

/**
 * Ubah isi CSV menjadi rencana. Baris dengan blok + jalan yang sama digabung: kolom Nomor
 * dikumpulkan menjadi cakupan jalan itu. Aksi per baris: blok baru, jalan baru, nomor ditambah, sudah ada.
 */
function rencana(rows, blokAda, gangAda, boleBuatBlok) {
  const [header, ...data] = rows;
  const norm = header.map((h) => String(h).trim().toLowerCase());
  const idx = Object.fromEntries(Object.entries(ALIAS).map(([k, names]) => [k, norm.findIndex((h) => names.includes(h))]));
  if (idx.gang < 0) return { kurang: ['jalan'], list: [], ops: [] };
  const kodeAda = new Set(blokAda.map((b) => b.kode));
  const barisBlokBaru = new Map(); // kode -> nama
  const ops = new Map(); // "blok|jalan" -> { id?, nama, blok, tokens:Set, awal:Set, baru }
  for (const g of gangAda) {
    const t = new Set(daftarNomorGang(g));
    ops.set(`${g.blok || ''}|${g.nama.trim().toLowerCase()}`, { id: g.id, nama: g.nama, blok: g.blok || '', tokens: t, awal: new Set(t), baru: false });
  }
  const list = data.map((r, n) => {
    const ambil = (k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
    const kode = ambil('blok').toUpperCase();
    const nama = ambil('nama_blok');
    const gang = ambil('gang');
    const tokens = ambil('nomor').split(/[,;]/).map((t) => t.trim().toUpperCase()).filter(Boolean);
    const out = { baris: n + 2, blok: kode, nomor: tokens.join(', '), gang, aksi: [], galat: '' };
    if (kode && !/^[A-Z0-9]{1,5}$/.test(kode)) { out.galat = 'Kode blok: huruf/angka, maks. 5 karakter'; return out; }
    if (!kode && !gang && !tokens.length) { out.galat = 'Baris kosong'; return out; }
    if (tokens.length && !gang) { out.galat = 'Jalan wajib diisi bila Nomor terisi'; return out; }
    if (gang && (gang.length < 2 || gang.length > 60)) { out.galat = 'Nama jalan 2–60 karakter'; return out; }
    if (tokens.some((t) => !POLA_TOKEN.test(t))) { out.galat = 'Nomor: angka/huruf pendek, rentang ditulis 1-20, pisahkan dengan koma'; return out; }
    if (kode && !kodeAda.has(kode) && !barisBlokBaru.has(kode)) {
      if (!boleBuatBlok) { out.galat = `Blok ${kode} belum ada. Minta admin menambahkannya`; return out; }
      barisBlokBaru.set(kode, nama || `Blok ${kode}`);
      out.aksi.push('blok');
    }
    if (gang) {
      const k = `${kode}|${gang.toLowerCase()}`;
      let op = ops.get(k);
      if (!op) { op = { nama: gang, blok: kode, tokens: new Set(), awal: new Set(), baru: true }; ops.set(k, op); out.aksi.push('gang'); }
      const tambah = tokens.filter((t) => !op.tokens.has(t));
      tambah.forEach((t) => op.tokens.add(t));
      if (op.baru && !out.aksi.includes('gang')) out.aksi.push('nomor');
      else if (!op.baru && tambah.length) out.aksi.push('nomor');
      if (!out.aksi.some((a) => a === 'gang' || a === 'nomor')) out.aksi.push('ada');
      if ([...op.tokens].join(', ').length > 80) { out.galat = 'Cakupan nomor jalan ini terlalu panjang (maks. 80 karakter)'; }
    }
    return out;
  });
  const diubah = [...ops.values()].filter((o) => o.baru || [...o.tokens].some((t) => !o.awal.has(t)));
  return { kurang: [], list, ops: diubah, blokBaru: [...barisBlokBaru].map(([kode, nama]) => ({ kode, nama })) };
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

  const baruGang = useMemo(() => plan?.ops.filter((o) => o.baru) || [], [plan]);
  const ubahNomor = useMemo(() => plan?.ops.filter((o) => !o.baru) || [], [plan]);
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
    let b = 0; let g = 0; let u = 0;
    try {
      let urut = blok.reduce((a, x) => Math.max(a, x.urutan || 0), 0);
      for (const x of baruBlok) { await simpanBlok({ kode: x.kode, nama: x.nama.slice(0, 40), urutan: ++urut }); b++; }
      let urutGang = gang.length;
      const nomorDari = (o) => [...o.tokens].join(', ');
      for (const x of baruGang) {
        await simpanGang({ nama: x.nama, blok: x.blok || null, urutan: ++urutGang, ...(x.tokens.size ? { nomor: nomorDari(x) } : {}) });
        g++;
      }
      for (const x of ubahNomor) { await simpanGang({ id: x.id, nomor: nomorDari(x) }); u++; }
      await reload();
      setHasil({ b, g, u });
      setPlan(null);
      toast.success(`${g} jalan baru${u ? `, ${u} jalan diperbarui nomornya` : ''}${b ? `, ${b} blok` : ''}`);
    } catch (e) {
      toast.error(pesanError(e));
      if (b || g || u) { await reload(); setHasil({ b, g, u, terhenti: true }); setPlan(null); }
    } finally { setBusy(false); }
  }

  const cols = [
    { key: 'baris', label: 'Baris', sort: (x) => x.baris, render: (x) => <span className="num muted">{x.baris}</span> },
    { key: 'blok', label: 'Blok', sort: (x) => x.blok, render: (x) => <span className="cell-main">{x.blok || 'Lintas blok'}</span> },
    { key: 'nomor', label: 'Nomor', sort: (x) => x.nomor, render: (x) => x.nomor || <span className="muted">—</span> },
    { key: 'gang', label: 'Jalan', sort: (x) => x.gang, render: (x) => x.gang || <span className="muted">—</span> },
    { key: 'st', label: 'Hasil', sort: (x) => (x.galat ? 0 : x.aksi.includes('gang') ? 1 : x.aksi.includes('nomor') ? 2 : 3), render: (x) => (x.galat ? <Badge tone="bad">{x.galat}</Badge>
      : <span className="row wrap" style={{ gap: 6, justifyContent: 'inherit' }}>{x.aksi.includes('blok') && <Badge tone="info">Blok baru</Badge>}{x.aksi.includes('gang') ? <Badge tone="ok">Jalan baru</Badge> : x.aksi.includes('nomor') ? <Badge tone="ok">Nomor ditambah</Badge> : x.aksi.includes('ada') ? <Badge>Sudah ada</Badge> : null}</span>) },
  ];

  return (
    <Modal open={open} onClose={tutup} title="Impor blok & jalan" desc="Atur banyak jalan sekaligus dari berkas CSV: Blok | Nomor | Jalan." wide
      footer={<><Button variant="secondary" onClick={tutup}>Tutup</Button>{plan && <Button loading={busy} disabled={!baruGang.length && !ubahNomor.length && !baruBlok.length} onClick={terapkan}>Terapkan {baruGang.length} jalan baru{ubahNomor.length ? ` & ${ubahNomor.length} nomor` : ''}{baruBlok.length ? ` & ${baruBlok.length} blok` : ''}</Button>}</>}>
      <div className="stack">
        <p className="text-sm ink-2">Kolom: <b>Blok</b> (kode, mis. C) | <b>Nomor</b> (sub-blok atau rentang rumah di jalan itu, mis. 3 atau 1-20; boleh kosong) | <b>Jalan</b>. Satu jalan boleh punya beberapa baris dengan nomor berbeda; semuanya digabung. Kosongkan blok untuk jalan lintas blok. Jalan yang sudah ada hanya ditambah nomornya, tidak ada data yang dihapus.</p>
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
              {ubahNomor.length > 0 && <Badge tone="ok">{ubahNomor.length} jalan ditambah nomor</Badge>}
              {baruBlok.length > 0 && <Badge tone="info">{baruBlok.length} blok baru</Badge>}
              {galat.length > 0 && <Badge tone="bad">{galat.length} baris bermasalah</Badge>}
            </div>
            <div className="card flush"><DataTable columns={cols} rows={plan.list.slice(0, 200)} rowKey="baris" caption="Pratinjau impor blok dan jalan" /></div>
            {plan.list.length > 200 && <p className="text-sm muted">Menampilkan 200 dari {plan.list.length} baris.</p>}
          </>
        )}
        {hasil && (
          <Callout tone={hasil.terhenti ? 'warn' : 'ok'} icon={CircleCheck}>
            {hasil.g} jalan baru{hasil.u ? `, ${hasil.u} jalan diperbarui nomornya` : ''}{hasil.b ? `, ${hasil.b} blok baru` : ''} berhasil diterapkan.{hasil.terhenti ? ' Proses terhenti di tengah; impor ulang berkas yang sama akan melewati yang sudah masuk.' : ''}
          </Callout>
        )}
      </div>
    </Modal>
  );
}
