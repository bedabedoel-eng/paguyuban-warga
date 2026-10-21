import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileUp, CircleCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Callout, Badge, Button, Card, DataTable, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { parseCsv, CONTOH_CSV } from '../../lib/csv';
import { formatHp } from '../../lib/phone';
import { olahBaris } from '../../lib/importWarga';
import { importWarga } from '../../services/warga';
import { pesanError } from '../../lib/errors';
import PinAwalHasil from './PinAwalHasil';

export default function ImportWarga({ tertanam = false }) {
  const { blok, gang } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef(null);
  const [nama, setNama] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [laporan, setLaporan] = useState(null);
  const blokKode = useMemo(() => blok.map((b) => b.kode), [blok]);
  const adaPin = !!laporan?.akun?.length;

  // PIN awal hanya ada di layar ini; ingatkan bila halaman hendak ditutup sebelum diunduh
  useEffect(() => {
    if (!adaPin) return undefined;
    const jaga = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', jaga);
    return () => window.removeEventListener('beforeunload', jaga);
  }, [adaPin]);

  async function pilih(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setLaporan(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Berkas terlalu besar (maks. 2 MB)');
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { setData(null); return toast.error('Berkas kosong atau bukan CSV. Simpan dari Excel sebagai CSV.'); }
    const out = olahBaris(rows, blokKode, gang);
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
    if (!(await confirm({ title: `Buat ${valid.length} akun warga?`, text: 'Semua akun langsung aktif dengan PIN awal acak yang berbeda untuk tiap warga. Daftar PIN ditampilkan sekali setelah proses selesai dan bisa diunduh sebagai CSV. Warga diminta membuat PIN baru saat pertama masuk.', okLabel: 'Buat Akun' }))) return;
    setLoading(true);
    const dibuat = [];
    const dilewati = [];
    const akun = [];
    try {
      for (let i = 0; i < valid.length; i += 100) {
        const potong = valid.slice(i, i + 100);
        const res = await importWarga(potong.map(({ nama: n, hp, blok: b, no_rumah, gang: g, pekerjaan, kepala_keluarga, status_pernikahan, jumlah_anak, status_hunian, foto }) => ({ nama: n, hp, blok: b, no_rumah, gang: g || null, pekerjaan, kepala_keluarga, status_pernikahan: status_pernikahan || null, jumlah_anak: jumlah_anak || null, status_hunian: status_hunian || null, foto: foto || null })));
        dibuat.push(res.dibuat || 0);
        for (const a of res.akun || []) akun.push({ ...a, baris: potong[a.baris - 1]?.baris ?? a.baris });
        for (const s of res.dilewati || []) dilewati.push({ ...s, baris: potong[s.baris - 1]?.baris ?? s.baris });
      }
      const total = dibuat.reduce((a, b) => a + b, 0);
      setLaporan({ dibuat: total, dilewati, akun });
      setData(null);
      toast.success(`${total} akun warga dibuat`);
    } catch (e) {
      toast.error(pesanError(e));
      const total = dibuat.reduce((a, b) => a + b, 0);
      if (total) setLaporan({ dibuat: total, dilewati, terhenti: true, akun });
    } finally { setLoading(false); }
  }

  const cols = [
    { key: 'baris', label: 'Baris', sort: (x) => x.baris, render: (x) => <span className="num muted">{x.baris}</span> },
    { key: 'nama', label: 'Nama', sort: (x) => x.nama, render: (x) => <span className="cell-main">{x.nama || '—'}</span> },
    { key: 'hp', label: 'Nomor HP', render: (x) => <span className="num nowrap">{x.hp ? formatHp(x.hp) : '—'}</span> },
    { key: 'blok', label: 'Blok', sort: (x) => x.blok, render: (x) => <span>{x.blok || '—'}</span> },
    { key: 'sub', label: 'Sub-blok', sort: (x) => x.sub_blok, render: (x) => <span>{x.sub_blok || <span className="muted">-</span>}</span> },
    { key: 'nomor', label: 'No.', sort: (x) => x.nomor, render: (x) => <span>{x.nomor || '—'}{x.gang ? <span className="muted"> · {x.gang}</span> : ''}</span> },
    { key: 'st', label: 'Status', sort: (x) => (x.galat ? 0 : 1), render: (x) => (x.galat ? <Badge tone="bad">{x.galat}</Badge> : <Badge tone="ok">Siap</Badge>) },
  ];

  return (
    <div className={tertanam ? 'stack' : 'page medium'}>
      {!tertanam && <PageHeader back title="Import warga" desc="Buat banyak akun warga sekaligus dari berkas CSV (Excel > Simpan sebagai CSV)." />}
      <Card pad className="stack">
        <div className="steps">
          <div className="step"><span className="n">1</span><div className="body">
            <h3>Siapkan berkas</h3>
            <p className="text-sm ink-2">Kolom wajib <b>nama, hp, blok, no_rumah</b>. Sub-blok boleh di kolom sendiri (<b>sub_blok</b>), mis. blok <b>A</b>, sub_blok <b>3</b>, no_rumah <b>5</b>; penulisan gabungan seperti <b>A3</b> + <b>5</b>, <b>3/5</b>, atau satu kolom <b>alamat</b> berisi “Blok A3 No.5” juga dipahami dan dipisah otomatis, sehingga hasilnya bisa direkap per blok, sub-blok, dan nomor. Opsional <b>jalan</b> (nama jalan persis seperti di menu Blok & jalan), <b>pekerjaan</b>, <b>kepala_keluarga</b> (ya/tidak), <b>status_hunian</b> (milik sendiri / kontrak), <b>status_pernikahan</b> (belum menikah / menikah / cerai hidup / cerai mati), <b>jumlah_anak</b> (diisi bila sudah menikah), dan <b>foto</b> (tautan gambar https). Satu baris untuk satu orang dengan nomor HP sendiri.</p>
            <div style={{ marginTop: 10 }}><Button size="sm" variant="secondary" icon={Download} onClick={unduhContoh}>Unduh contoh CSV</Button></div>
          </div></div>
          <div className="step"><span className="n">2</span><div className="body">
            <h3>Pilih dan periksa</h3>
            <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain" onChange={pilih} hidden />
            <div className="row wrap"><Button size="sm" icon={FileUp} onClick={() => inputRef.current?.click()}>Pilih berkas CSV</Button>{nama && <span className="text-sm muted">{nama}</span>}</div>
          </div></div>
          <div className="step"><span className="n">3</span><div className="body">
            <h3>Buat akun</h3>
            <Callout tone="info">Semua akun langsung <b>aktif</b>. Tiap warga mendapat <b>PIN awal acak yang berbeda</b>. Daftar PIN ditampilkan sekali setelah proses selesai (bisa diunduh sebagai CSV), lalu sampaikan ke warga lewat pesan pribadi. Warga wajib membuat PIN baru saat pertama masuk.</Callout>
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
          {laporan.terhenti && <Callout tone="bad">Proses terhenti di tengah jalan. Akun yang sudah dibuat tetap tersimpan; impor ulang berkas yang sama akan melewati nomor yang sudah terdaftar. Bila ada akun yang tidak muncul di daftar PIN di bawah, buka Data anggota lalu pakai “Atur ulang PIN” untuk akun itu.</Callout>}
          <PinAwalHasil akun={laporan.akun} nama="pin-awal-import" />
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
