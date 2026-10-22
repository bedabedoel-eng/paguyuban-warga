import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CircleCheck, Download, FileUp, RotateCcw } from 'lucide-react';
import { Badge, Button, Callout, Chips, DataTable, Modal, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { parseCsv, CONTOH_CSV, toCsv, unduhBerkas, stempelTanggal } from '../../lib/csv';
import { bandingkanCsv, barisBuat } from '../../lib/perbaikanWarga';
import { eksporWarga } from '../../lib/eksporWarga';
import { formatHp } from '../../lib/phone';
import { pesanError } from '../../lib/errors';
import { importWarga, perbaruiWargaMassal } from '../../services/warga';
import PinAwalHasil from '../admin/PinAwalHasil';

const JENIS = {
  ubah: { label: 'Diubah', tone: 'info' },
  baru: { label: 'Akun baru', tone: 'ok' },
  sama: { label: 'Tidak berubah', tone: '' },
  galat: { label: 'Bermasalah', tone: 'bad' },
};
const TAMPIL_MAKS = 300;

/**
 * Import & perbaiki data warga dari CSV, satu pintu:
 * baris yang cocok dengan warga terdaftar (kolom id dari Ekspor, atau nomor HP) diperbarui;
 * nomor HP yang belum terdaftar menjadi akun baru (admin). Pratinjau menunjukkan perubahan per kolom
 * sebelum apa pun disimpan.
 *
 * warga     daftar warga yang sedang dimuat di halaman (dipakai untuk mencocokkan dan untuk Ekspor)
 * bolehUbah kewenangan atas seorang warga (sama dengan aksi Ubah massal)
 */
export default function ImporWarga({ warga = [], bolehUbah, onClose, onSelesai }) {
  const { hak, user } = useAuth();
  const { blok, gang } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef(null);
  const [berkas, setBerkas] = useState(null); // { nama, rows }
  const [lihat, setLihat] = useState('');
  const [proses, setProses] = useState(null); // teks kemajuan
  const [hasil, setHasil] = useState(null);
  const admin = !!hak.admin;
  const blokKode = useMemo(() => blok.map((b) => b.kode), [blok]);

  const banding = useMemo(() => (berkas
    ? bandingkanCsv(berkas.rows, { warga, blokKode, gang, admin, uid: user.id, bolehUbah })
    : null), [berkas, warga, blokKode, gang, admin, user.id, bolehUbah]);
  const daftar = banding?.list || [];
  const ubah = daftar.filter((x) => x.jenis === 'ubah');
  const baru = daftar.filter((x) => x.jenis === 'baru');
  const bermasalah = daftar.filter((x) => x.jenis === 'galat');
  const adaPin = !!hasil?.akun?.length;

  // PIN awal hanya ada di layar ini; ingatkan bila halaman hendak ditutup sebelum diunduh
  useEffect(() => {
    if (!adaPin) return undefined;
    const jaga = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', jaga);
    return () => window.removeEventListener('beforeunload', jaga);
  }, [adaPin]);

  async function tutup() {
    if (proses) return;
    if (adaPin && !(await confirm({ title: 'Tutup tanpa mengunduh PIN?', text: 'PIN awal akun baru tidak bisa dilihat lagi setelah jendela ini ditutup. Bila terlewat, gunakan Atur ulang PIN di form Ubah.', okLabel: 'Tutup', danger: true }))) return;
    if (hasil) onSelesai?.();
    onClose();
  }

  async function pilih(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Berkas terlalu besar (maks. 2 MB)');
    const rows = parseCsv(await file.text());
    if (rows.length < 2) return toast.error('Berkas kosong atau bukan CSV. Di Excel: File > Simpan sebagai > CSV.');
    setHasil(null);
    setLihat('');
    setBerkas({ nama: file.name, rows });
  }

  function eksporSekarang() {
    if (!warga.length) return toast.error('Belum ada data warga untuk diekspor');
    const n = eksporWarga(warga.filter((w) => bolehUbah(w)), gang, 'perbaikan-data-warga');
    toast.success(`${n} warga diekspor. Perbaiki di Excel, simpan sebagai CSV, lalu pilih berkasnya di sini.`);
  }
  const unduhContoh = () => unduhBerkas('contoh-import-warga.csv', CONTOH_CSV);

  /** Baris bermasalah + alasannya, dalam bentuk berkas asli agar bisa langsung diperbaiki dan diimpor ulang. */
  function unduhBermasalah(list) {
    const [header] = berkas.rows;
    const kolom = [...header.map((h, i) => ({ key: String(i), label: h, nilai: (x) => x.r[i] ?? '' })), { key: 'alasan', label: 'alasan', nilai: (x) => x.alasan }];
    const isi = list.map((x) => ({ r: berkas.rows[x.baris - 1] || [], alasan: x.alasan }));
    unduhBerkas(`baris-bermasalah-${stempelTanggal()}.csv`, toCsv(isi, kolom));
  }

  async function terapkan() {
    const n = ubah.length + baru.length;
    if (!n) return;
    const teks = [
      ubah.length ? `${ubah.length} warga diperbarui.` : '',
      baru.length ? `${baru.length} akun baru dibuat dan langsung aktif dengan PIN awal acak (ditampilkan sekali setelah selesai).` : '',
      bermasalah.length ? `${bermasalah.length} baris bermasalah dilewati.` : '',
    ].filter(Boolean).join(' ');
    if (!(await confirm({ title: `Terapkan ${n} perubahan?`, text: teks, okLabel: 'Terapkan' }))) return;

    const diubah = []; const dibuat = []; const dilewati = []; const akun = [];
    let terhenti = null;
    try {
      for (let i = 0; i < ubah.length; i += 200) {
        const potong = ubah.slice(i, i + 200);
        setProses(`Memperbarui ${Math.min(i + 200, ubah.length)} dari ${ubah.length} warga…`);
        const res = await perbaruiWargaMassal(potong.map((x) => x.patch));
        diubah.push(res.diubah || 0);
        for (const s of res.dilewati || []) dilewati.push({ ...s, baris: potong[s.baris - 1]?.baris ?? s.baris });
      }
      for (let i = 0; i < baru.length; i += 100) {
        const potong = baru.slice(i, i + 100);
        setProses(`Membuat ${Math.min(i + 100, baru.length)} dari ${baru.length} akun…`);
        const res = await importWarga(potong.map((x) => barisBuat(x.buat)));
        dibuat.push(res.dibuat || 0);
        for (const a of res.akun || []) akun.push({ ...a, baris: potong[a.baris - 1]?.baris ?? a.baris });
        for (const s of res.dilewati || []) dilewati.push({ ...s, baris: potong[s.baris - 1]?.baris ?? s.baris });
      }
    } catch (e) {
      terhenti = pesanError(e);
      toast.error(terhenti);
    } finally { setProses(null); }
    const total = { diubah: diubah.reduce((a, b) => a + b, 0), dibuat: dibuat.reduce((a, b) => a + b, 0) };
    if (!terhenti) toast.success([total.diubah && `${total.diubah} warga diperbarui`, total.dibuat && `${total.dibuat} akun dibuat`].filter(Boolean).join(', ') || 'Tidak ada yang berubah');
    setHasil({ ...total, dilewati: dilewati.sort((a, b) => a.baris - b.baris), akun, terhenti });
  }

  // Yang perlu diperiksa (diubah, baru, bermasalah) di atas; yang tidak berubah di bawah
  const URUT = { galat: 0, ubah: 1, baru: 2, sama: 3 };
  const tampil = (lihat ? daftar.filter((x) => x.jenis === lihat) : [...daftar].sort((a, b) => URUT[a.jenis] - URUT[b.jenis] || a.baris - b.baris)).slice(0, TAMPIL_MAKS);
  const cols = [
    { key: 'baris', label: 'Baris', sort: (x) => x.baris, render: (x) => <span className="num muted">{x.baris}</span> },
    { key: 'nama', label: 'Warga', sort: (x) => x.nama, render: (x) => (
      <div style={{ textAlign: 'left' }}>
        <div className="cell-main">{x.nama || '—'}</div>
        <div className="cell-sub">{[x.alamat, x.buat?.hp && formatHp(x.buat.hp)].filter(Boolean).join(' · ')}</div>
      </div>
    ) },
    { key: 'jenis', label: 'Hasil', sort: (x) => x.jenis, render: (x) => <Badge tone={JENIS[x.jenis].tone} dot>{JENIS[x.jenis].label}</Badge> },
    { key: 'isi', label: 'Perubahan', render: (x) => (
      <div className="stack-xs imp-ubah" style={{ textAlign: 'left' }}>
        {x.jenis === 'galat' && <span className="t-bad text-sm">{x.galat}</span>}
        {x.jenis === 'baru' && <span className="text-sm ink-2">Blok {x.buat.blok} No. {x.buat.no_rumah}{x.buat.gang ? ` · ${x.buat.gang}` : ''}</span>}
        {x.perubahan.map((p) => (
          <span key={p.kolom} className="text-sm imp-diff">
            <b>{p.label}</b> <span className="lama">{p.lama || 'kosong'}</span><ArrowRight size={12} aria-label="menjadi" /><span className="baru">{p.baru || 'kosong'}</span>
          </span>
        ))}
        {x.catatan?.map((c) => <span key={c} className="text-xs muted">{c}</span>)}
      </div>
    ) },
  ];

  const kaki = hasil
    ? <Button onClick={tutup}>Selesai</Button>
    : banding && !banding.kurang.length
      ? <><Button variant="secondary" icon={RotateCcw} onClick={() => setBerkas(null)} disabled={!!proses}>Ganti berkas</Button>
          <Button loading={!!proses} disabled={!ubah.length && !baru.length} onClick={terapkan}>
            {ubah.length || baru.length ? `Terapkan ${[ubah.length && `${ubah.length} perubahan`, baru.length && `${baru.length} akun baru`].filter(Boolean).join(' + ')}` : 'Tidak ada yang perlu diterapkan'}
          </Button></>
      : <Button variant="secondary" onClick={tutup}>Tutup</Button>;

  return (
    <Modal open onClose={tutup} wide title="Import & perbaiki data warga"
      desc={hasil ? 'Proses selesai.' : berkas ? berkas.nama : 'Satu berkas CSV untuk menambah warga baru sekaligus memperbaiki data warga lama.'}
      footer={kaki}>
      <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain" onChange={pilih} hidden />

      {!berkas && !hasil && (
        <div className="stack">
          <div className="steps">
            <div className="step"><span className="n">1</span><div className="body">
              <h3>Ekspor data sekarang</h3>
              <p className="text-sm ink-2">Berkas berisi semua warga yang Anda kelola, lengkap dengan kolom <b>id</b> sebagai kunci pencocokan. Untuk mengekspor sebagian saja, pakai filter di tabel lalu tombol <b>Ekspor CSV</b>.</p>
              <div className="row wrap" style={{ marginTop: 10 }}>
                <Button size="sm" variant="secondary" icon={Download} onClick={eksporSekarang}>Ekspor data untuk diperbaiki</Button>
                {admin && <Button size="sm" variant="ghost" icon={Download} onClick={unduhContoh}>Contoh berkas warga baru</Button>}
              </div>
            </div></div>
            <div className="step"><span className="n">2</span><div className="body">
              <h3>Perbaiki di Excel atau Google Sheets</h3>
              <ul className="text-sm ink-2 list-plain">
                <li>Ubah isi sel yang salah. Jangan ubah kolom <b>id</b>.</li>
                <li>Kolom yang dihapus dari berkas <b>tidak diubah</b>. Baris yang dihapus juga tidak disentuh.</li>
                <li>Sel kosong mengosongkan data: jalan, pekerjaan, pernikahan, jumlah anak, rumah ditempati. Nomor HP, kepala keluarga, foto, dan keanggotaan yang kosong <b>tidak diubah</b>.</li>
                {admin
                  ? <li>Tambah warga baru di baris baru dengan <b>id kosong</b>: wajib nama, hp, blok, no_rumah. Akun langsung aktif dengan PIN awal acak.</li>
                  : <li>Akun baru, nomor HP, dan foto hanya bisa diubah admin.</li>}
                <li>Simpan sebagai <b>CSV</b> (File &gt; Simpan sebagai &gt; CSV).</li>
              </ul>
            </div></div>
            <div className="step"><span className="n">3</span><div className="body">
              <h3>Pilih berkas, periksa, lalu terapkan</h3>
              <p className="text-sm ink-2">Sebelum disimpan, Anda melihat apa yang berubah di tiap baris. Baris tanpa id dicocokkan lewat nomor HP.</p>
              <div style={{ marginTop: 10 }}><Button size="sm" icon={FileUp} onClick={() => inputRef.current?.click()}>Pilih berkas CSV</Button></div>
            </div></div>
          </div>
        </div>
      )}

      {banding?.kurang.length > 0 && !hasil && (
        <div className="stack">
          <Callout tone="bad">{banding.kurang.join(' ')} Periksa baris judul (header) berkas.</Callout>
          <div><Button size="sm" icon={FileUp} onClick={() => inputRef.current?.click()}>Pilih berkas lain</Button></div>
        </div>
      )}

      {banding && !banding.kurang.length && !hasil && (
        <div className="stack">
          {proses && <Callout tone="info">{proses}</Callout>}
          <Chips label="Saring pratinjau" value={lihat} onChange={setLihat} tabs={[
            { value: '', label: 'Semua', n: daftar.length },
            ...['ubah', 'baru', 'galat', 'sama'].filter((j) => banding.jumlah[j]).map((j) => ({ value: j, label: JENIS[j].label, n: banding.jumlah[j] })),
          ]} />
          {bermasalah.length > 0 && (
            <div className="row wrap">
              <span className="text-sm ink-2">{bermasalah.length} baris bermasalah akan dilewati.</span>
              <Button size="xs" variant="ghost" icon={Download} onClick={() => unduhBermasalah(bermasalah.map((x) => ({ baris: x.baris, alasan: x.galat })))}>Unduh untuk diperbaiki</Button>
            </div>
          )}
          {!ubah.length && !baru.length && !bermasalah.length && <Callout tone="ok">Semua baris sudah sama dengan data di sistem. Tidak ada yang perlu diubah.</Callout>}
          <DataTable columns={cols} rows={tampil} rowKey="baris" caption="Pratinjau import" />
          {(lihat ? banding.jumlah[lihat] : daftar.length) > TAMPIL_MAKS && <p className="text-sm muted">Menampilkan {TAMPIL_MAKS} baris pertama; semua baris tetap diproses.</p>}
        </div>
      )}

      {hasil && (
        <div className="stack">
          <div className="row"><CircleCheck size={20} className="t-ok" /><h3>{[`${hasil.diubah} warga diperbarui`, hasil.dibuat ? `${hasil.dibuat} akun dibuat` : ''].filter(Boolean).join(' · ')}</h3></div>
          {hasil.terhenti && <Callout tone="bad">Proses terhenti: {hasil.terhenti} Perubahan yang sudah tersimpan tetap ada. Pilih berkas yang sama lagi: baris yang sudah benar akan tampil "Tidak berubah", sisanya bisa diterapkan ulang.</Callout>}
          <PinAwalHasil akun={hasil.akun} nama="pin-awal-import" />
          {hasil.dilewati.length > 0 && (
            <div className="stack-sm">
              <div className="row wrap">
                <span className="text-sm ink-2">{hasil.dilewati.length} baris ditolak server:</span>
                <Button size="xs" variant="ghost" icon={Download} onClick={() => unduhBermasalah(hasil.dilewati)}>Unduh untuk diperbaiki</Button>
              </div>
              <ul className="text-sm">{hasil.dilewati.map((x, i) => <li key={i}>Baris {x.baris}{x.nama ? ` (${x.nama})` : ''}: {x.alasan}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
