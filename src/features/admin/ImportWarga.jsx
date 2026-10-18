import { useMemo, useRef, useState } from 'react';
import { Download, FileUp, CircleAlert, CircleCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Alert, Badge, Button, Card, useConfirm } from '../../components/ui';
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
  const [hasil, setHasil] = useState(null);
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

  return (
    <>
      <PageHeader title="Import Warga" />
      <div className="page">
        <div className="page-inner">
          <Card pad className="stack">
            <h2>Import data warga dari CSV</h2>
            <p className="small text-2">
              Kolom yang dibaca: <b>nama, hp, blok, no_rumah</b> (wajib), serta <b>pekerjaan</b> dan <b>kepala_keluarga</b> (ya/tidak, opsional).
              Dari Excel, pilih <i>Save As &gt; CSV</i>. Satu baris untuk satu orang yang punya nomor HP sendiri.
            </p>
            <Alert tone="info">
              Semua akun dibuat <b>aktif</b> dengan PIN awal <b>{PIN_AWAL}</b>. Saat pertama masuk, warga langsung diminta membuat PIN baru.
              Bagikan PIN awal hanya lewat grup warga atau pesan langsung, dan minta segera masuk.
            </Alert>
            <div className="row wrap">
              <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain" onChange={pilih} style={{ display: 'none' }} />
              <Button icon={FileUp} onClick={() => inputRef.current?.click()}>Pilih Berkas CSV</Button>
              <Button variant="outline" icon={Download} onClick={unduhContoh}>Unduh Contoh</Button>
              {nama && <span className="small muted">{nama}</span>}
            </div>
          </Card>

          {data?.kurang.length > 0 && (
            <Alert tone="error" icon={CircleAlert}>Kolom wajib tidak ditemukan: <b>{data.kurang.join(', ')}</b>. Periksa baris judul (header) berkas Anda.</Alert>
          )}

          {data && data.kurang.length === 0 && (
            <Card pad className="stack">
              <div className="row between wrap">
                <div className="row wrap">
                  <Badge tone="green">{valid.length} siap diimpor</Badge>
                  {bermasalah.length > 0 && <Badge tone="red">{bermasalah.length} bermasalah</Badge>}
                </div>
                <Button loading={loading} disabled={!valid.length} onClick={proses}>Buat {valid.length} Akun</Button>
              </div>
              {bermasalah.length > 0 && <p className="small text-2">Baris bermasalah akan dilewati. Perbaiki di berkas lalu impor lagi bila perlu.</p>}
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Baris</th><th>Nama</th><th>Nomor HP</th><th>Rumah</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.list.slice(0, 300).map((x) => (
                      <tr key={x.baris}>
                        <td>{x.baris}</td>
                        <td><b>{x.nama || '-'}</b></td>
                        <td className="nowrap">{x.hp ? formatHp(x.hp) : '-'}</td>
                        <td className="nowrap">{x.blok}-{x.no_rumah}</td>
                        <td>{x.galat ? <span className="red small">{x.galat}</span> : <span className="green small">Siap</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.list.length > 300 && <p className="small muted">Menampilkan 300 baris pertama dari {data.list.length}.</p>}
            </Card>
          )}

          {laporan && (
            <Card pad className="stack">
              <div className="row"><CircleCheck size={20} className="green" /><h2>{laporan.dibuat} akun berhasil dibuat</h2></div>
              {laporan.terhenti && <Alert tone="error" icon={CircleAlert}>Proses terhenti di tengah jalan. Akun yang sudah dibuat tetap tersimpan; impor ulang berkas yang sama akan melewati nomor yang sudah terdaftar.</Alert>}
              {laporan.dilewati.length > 0 && (
                <>
                  <p className="small text-2">{laporan.dilewati.length} baris dilewati oleh server:</p>
                  <ul className="small">{laporan.dilewati.map((s, i) => <li key={i}>Baris {s.baris}{s.nama ? ` (${s.nama})` : ''}: {s.alasan}</li>)}</ul>
                </>
              )}
              <p className="small text-2">Pantau warga yang belum mengganti PIN di <b>Data Warga</b> (filter "Belum ganti PIN").</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
