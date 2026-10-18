import { useMemo, useRef, useState } from 'react';
import { Download, FileUp, CircleCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Callout, Badge, Button, Card, DataTable, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { parseCsv, CONTOH_CSV } from '../../lib/csv';
import { normalizeHp, formatHp } from '../../lib/phone';
import { importWarga } from '../../services/warga';
import { pesanError } from '../../lib/errors';

const PIN_AWAL = '123456';
const ALIAS = {
  nama: ['nama', 'nama lengkap', 'name'],
  hp: ['hp', 'no hp', 'nomor hp', 'no_hp', 'nomor_hp', 'telepon', 'telp', 'wa', 'whatsapp'],
  blok: ['blok', 'block'],
  no_rumah: ['no_rumah', 'no rumah', 'nomor rumah', 'nomor_rumah', 'no', 'nomor'],
  rumah: ['rumah', 'blok_rumah', 'blok rumah', 'alamat'],
  pekerjaan: ['pekerjaan', 'keahlian', 'profesi'],
  kepala_keluarga: ['kepala_keluarga', 'kepala keluarga', 'kk'],
};

function petaKolom(header) {
  const norm = header.map((h) => String(h).trim().toLowerCase());
  const idx = {};
  for (const [k, names] of Object.entries(ALIAS)) idx[k] = norm.findIndex((h) => names.includes(h));
  return idx;
}

/** Ubah baris CSV menjadi objek, lalu validasi di sisi aplikasi (server memeriksa ulang). */
function olahBaris(rows, blokKode) {
  const [header, ...data] = rows;
  const idx = petaKolom(header);
  const wajib = ['nama', 'hp'];
  const kurang = wajib.filter((k) => idx[k] < 0);
  if (idx.blok < 0 && idx.rumah < 0) kurang.push('blok');
  if (idx.no_rumah < 0 && idx.rumah < 0) kurang.push('no_rumah');
  if (kurang.length) return { kurang, list: [] };
  const sudah = new Set();
  const list = data.map((r, n) => {
    const ambil = (k) => (idx[k] >= 0 ? String(r[idx[k]] ?? '').trim() : '');
    let blok = ambil('blok').toUpperCase();
    let no = ambil('no_rumah').toUpperCase();
    if ((!blok || !no) && idx.rumah >= 0) {
      const m = ambil('rumah').toUpperCase().replace(/\s+/g, '').match(/^([A-Z0-9]{1,5}?)[-/]?([0-9]{1,4}[A-Z]?)$/);
      if (m) { blok = blok || m[1]; no = no || m[2]; }
    }
    const hp = normalizeHp(ambil('hp'));
    const nama = ambil('nama');
    let galat = '';
    if (nama.length < 2) galat = 'Nama kosong/terlalu pendek';
    else if (!hp) galat = 'Nomor HP tidak valid';
    else if (!blokKode.includes(blok)) galat = `Blok "${blok || '-'}" tidak dikenal`;
    else if (!/^[0-9A-Z-]{1,6}$/.test(no)) galat = 'Nomor rumah tidak valid';
    else if (sudah.has(hp)) galat = 'Nomor HP ganda di berkas';
    if (hp) sudah.add(hp);
    return { baris: n + 2, nama, hp, blok, no_rumah: no, pekerjaan: ambil('pekerjaan'), kepala_keluarga: ambil('kepala_keluarga'), galat };
  });
  return { kurang: [], list };
}

export default function ImportWarga() {
  const { blok } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef(null);
  const [nama, setNama] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [laporan, setLaporan] = useState(null);
  const blokKode = useMemo(() => blok.map((b) => b.kode), [blok]);

  async function pilih(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setLaporan(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Berkas terlalu besar (maks. 2 MB)');
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { setData(null); return toast.error('Berkas kosong atau bukan CSV. Simpan dari Excel sebagai CSV.'); }
    const out = olahBaris(rows, blokKode);
    setNama(file.name);
    setData(out);
  }

  function unduhContoh() {
    const url = URL.createObjectURL(new Blob([CONTOH_CSV], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'contoh-import-warga.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const valid = data?.list.filter((x) => !x.galat) || [];
  const bermasalah = data?.list.filter((x) => x.galat) || [];

  async function proses() {
    if (!valid.length) return;
    if (!(await confirm({ title: `Buat ${valid.length} akun warga?`, text: `Semua akun langsung aktif dengan PIN awal ${PIN_AWAL}. Warga diminta membuat PIN baru saat pertama masuk.`, okLabel: 'Buat Akun' }))) return;
    setLoading(true);
    const dibuat = [];
    const dilewati = [];
    try {
      for (let i = 0; i < valid.length; i += 100) {
        const potong = valid.slice(i, i + 100);
        const res = await importWarga(potong.map(({ nama: n, hp, blok: b, no_rumah, pekerjaan, kepala_keluarga }) => ({ nama: n, hp, blok: b, no_rumah, pekerjaan, kepala_keluarga })), PIN_AWAL);
        dibuat.push(res.dibuat || 0);
        for (const s of res.dilewati || []) dilewati.push({ ...s, baris: potong[s.baris - 1]?.baris ?? s.baris });
      }
      const total = dibuat.reduce((a, b) => a + b, 0);
      setLaporan({ dibuat: total, dilewati });
      setData(null);
      toast.success(`${total} akun warga dibuat`);
    } catch (e) {
      toast.error(pesanError(e));
      const total = dibuat.reduce((a, b) => a + b, 0);
      if (total) setLaporan({ dibuat: total, dilewati, terhenti: true });
    } finally { setLoading(false); }
  }

  const cols = [
    { key: 'baris', label: 'Baris', render: (x) => <span className="num muted">{x.baris}</span> },
    { key: 'nama', label: 'Nama', render: (x) => <span className="cell-main">{x.nama || '—'}</span> },
    { key: 'hp', label: 'Nomor HP', render: (x) => <span className="num nowrap">{x.hp ? formatHp(x.hp) : '—'}</span> },
    { key: 'rumah', label: 'Rumah', render: (x) => <span className="nowrap">{x.blok}-{x.no_rumah}</span> },
    { key: 'st', label: 'Status', render: (x) => (x.galat ? <Badge tone="bad">{x.galat}</Badge> : <Badge tone="ok">Siap</Badge>) },
  ];

  return (
    <div className="page medium">
      <PageHeader back title="Import warga" desc="Buat banyak akun warga sekaligus dari berkas CSV (Excel > Simpan sebagai CSV)." />
      <Card pad className="stack">
        <div className="steps">
          <div className="step"><span className="n">1</span><div className="body">
            <h3>Siapkan berkas</h3>
            <p className="text-sm ink-2">Kolom wajib <b>nama, hp, blok, no_rumah</b>. Opsional <b>pekerjaan</b> dan <b>kepala_keluarga</b> (ya/tidak). Satu baris untuk satu orang dengan nomor HP sendiri.</p>
            <div style={{ marginTop: 10 }}><Button size="sm" variant="secondary" icon={Download} onClick={unduhContoh}>Unduh contoh CSV</Button></div>
          </div></div>
          <div className="step"><span className="n">2</span><div className="body">
            <h3>Pilih dan periksa</h3>
            <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain" onChange={pilih} hidden />
            <div className="row wrap"><Button size="sm" icon={FileUp} onClick={() => inputRef.current?.click()}>Pilih berkas CSV</Button>{nama && <span className="text-sm muted">{nama}</span>}</div>
          </div></div>
          <div className="step"><span className="n">3</span><div className="body">
            <h3>Buat akun</h3>
            <Callout tone="info">Semua akun langsung <b>aktif</b> dengan PIN awal <b className="num">{PIN_AWAL}</b>, dan warga wajib membuat PIN baru saat pertama masuk. Bagikan PIN awal hanya lewat pesan pribadi atau grup warga.</Callout>
          </div></div>
        </div>
      </Card>

      {data?.kurang.length > 0 && (
        <Callout tone="bad">Kolom wajib tidak ditemukan: <b>{data.kurang.join(', ')}</b>. Periksa baris judul (header) berkas.</Callout>
      )}

      {data && data.kurang.length === 0 && (
        <Card className="flush">
          <div className="card-head">
            <div className="t row wrap">
              <Badge tone="ok">{valid.length} siap</Badge>
              {bermasalah.length > 0 && <Badge tone="bad">{bermasalah.length} akan dilewati</Badge>}
            </div>
            <Button loading={loading} disabled={!valid.length} onClick={proses}>Buat {valid.length} akun</Button>
          </div>
          <div style={{ height: 12 }} />
          <DataTable columns={cols} rows={data.list.slice(0, 300)} rowKey="baris" caption="Pratinjau import" />
          {data.list.length > 300 && <div className="card-foot text-sm muted">Menampilkan 300 dari {data.list.length} baris.</div>}
        </Card>
      )}

      {laporan && (
        <Card pad className="stack-sm">
          <div className="row"><CircleCheck size={20} className="t-ok" /><h2>{laporan.dibuat} akun berhasil dibuat</h2></div>
          {laporan.terhenti && <Callout tone="bad">Proses terhenti di tengah jalan. Akun yang sudah dibuat tetap tersimpan; impor ulang berkas yang sama akan melewati nomor yang sudah terdaftar.</Callout>}
          {laporan.dilewati.length > 0 && (
            <>
              <p className="text-sm ink-2">{laporan.dilewati.length} baris dilewati server:</p>
              <ul className="text-sm">{laporan.dilewati.map((x, i) => <li key={i}>Baris {x.baris}{x.nama ? ` (${x.nama})` : ''}: {x.alasan}</li>)}</ul>
            </>
          )}
          <p className="text-sm muted">Pantau warga yang belum mengganti PIN di Data anggota, filter “Belum ganti PIN”.</p>
        </Card>
      )}
    </div>
  );
}
