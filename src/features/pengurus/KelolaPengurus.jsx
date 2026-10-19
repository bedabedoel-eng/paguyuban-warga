import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Network, Check, Minus } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, CardHead, CardBody, EmptyState, ErrorState, SkeletonRows, Modal, Input, Select, Checkbox, Callout, DataTable, IconButton, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { daftarPengurus, simpanPengurus, hapusPengurus } from '../../services/pengurus';
import { daftarWarga } from '../../services/warga';
import { PERAN_PENGURUS, MATRIKS, labelJabatan } from '../../lib/akses';

const PERAN_BLOK = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'];
const URUT = { ketua: 1, wakil_ketua: 2, sekretaris: 3, bendahara: 4, humas: 10, seksi: 20 };

function FormJabatan({ awal, warga, onClose, onSaved }) {
  const { gang, blok, namaGang, alamatPendek } = useSettings();
  const toast = useToast();
  const y = new Date().getFullYear();
  const [f, setF] = useState({
    warga_id: awal?.warga_id || '', peran: awal?.peran || 'seksi', jabatan: awal?.jabatan || '', wilayah_gang: awal?.wilayah_gang || '', wilayah_blok: awal?.wilayah_blok || '',
    periode_mulai: awal?.periode_mulai || y, periode_selesai: awal?.periode_selesai || y + 2, aktif: awal?.aktif ?? true,
  });
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const usulJabatan = (peran, wil) => (peran === 'humas' ? (namaGang(wil) ? `Humas ${namaGang(wil)}` : 'Humas Jalan') : peran === 'seksi' ? '' : PERAN_PENGURUS[peran].label);
  const jabatanOtomatis = (j) => !j || j.startsWith('Humas') || Object.values(PERAN_PENGURUS).some((p) => j.startsWith(p.label));
  function gantiPeran(v) { setF((s) => ({ ...s, peran: v, jabatan: jabatanOtomatis(s.jabatan) ? usulJabatan(v, s.wilayah_gang) : s.jabatan })); }
  async function simpan() {
    const er = {};
    if (!f.warga_id) er.warga_id = 'Pilih warga';
    if (f.jabatan.trim().length < 2) er.jabatan = 'Isi nama jabatan';
    if (f.peran === 'humas' && !f.wilayah_gang) er.wilayah_gang = gang.length ? 'Pilih jalan yang dipegang' : 'Buat daftar jalan dulu di menu Blok & jalan';
    if (Number(f.periode_selesai) < Number(f.periode_mulai)) er.periode_selesai = 'Tahun selesai sebelum tahun mulai';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      await simpanPengurus({ id: awal?.id, warga_id: f.warga_id, peran: f.peran, jabatan: f.jabatan.trim(), wilayah_gang: f.peran === 'humas' ? f.wilayah_gang : null, wilayah_blok: PERAN_BLOK.includes(f.peran) && f.wilayah_blok ? f.wilayah_blok : null,
        inti: PERAN_PENGURUS[f.peran].inti, urutan: URUT[f.peran], periode_mulai: Number(f.periode_mulai) || null, periode_selesai: Number(f.periode_selesai) || null, aktif: f.aktif });
      toast.success(awal ? 'Jabatan diperbarui' : 'Pengurus ditetapkan. Hak aksesnya aktif saat ia masuk berikutnya.');
      onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  return (
    <Modal open onClose={onClose} title={awal ? 'Ubah jabatan' : 'Tetapkan pengurus'} wide
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} onClick={simpan}>Simpan</Button></>}>
      <div className="stack">
        <Select label="Warga" value={f.warga_id} onChange={set('warga_id')} error={err.warga_id} placeholder="Pilih warga aktif" disabled={!!awal}
          options={(warga || []).map((w) => ({ value: w.id, label: `${w.nama} · ${alamatPendek(w)}` }))} />
        <div className="form-grid">
          <Select label="Peran" value={f.peran} onChange={(e) => gantiPeran(e.target.value)} options={Object.entries(PERAN_PENGURUS).map(([value, p]) => ({ value, label: p.label }))} hint={PERAN_PENGURUS[f.peran].ringkas} />
          {f.peran === 'humas'
            ? <Select label="Jalan yang dipegang" value={f.wilayah_gang} error={err.wilayah_gang} placeholder="Pilih"
                onChange={(e) => setF((s) => ({ ...s, wilayah_gang: e.target.value, jabatan: jabatanOtomatis(s.jabatan) ? usulJabatan('humas', e.target.value) : s.jabatan }))}
                options={gang.map((g) => ({ value: g.id, label: g.blok ? `${g.nama} (Blok ${g.blok})` : g.nama }))} />
            : <span />}
          {PERAN_BLOK.includes(f.peran) && (
            <Select fieldClass="span-2" label="Wilayah blok" value={f.wilayah_blok} onChange={set('wilayah_blok')} placeholder="Semua blok"
              options={blok.map((b) => ({ value: b.kode, label: b.nama }))}
              hint="Pilih blok bila pengurus ini hanya bertugas di satu blok. Data IPL, pengumuman, dan kegiatan dibatasi ke blok tersebut." />
          )}
          <Input fieldClass="span-2" label="Nama jabatan" value={f.jabatan} onChange={set('jabatan')} error={err.jabatan} maxLength={60} placeholder={f.peran === 'seksi' ? 'Contoh: Seksi Keamanan' : ''} hint="Tampil di halaman Pengurus dan profil." />
          <Input label="Periode mulai" type="number" min="2000" max="2100" value={f.periode_mulai} onChange={set('periode_mulai')} />
          <Input label="Periode selesai" type="number" min="2000" max="2100" value={f.periode_selesai} onChange={set('periode_selesai')} error={err.periode_selesai} />
        </div>
        <Checkbox checked={f.aktif} onChange={(v) => setF((s) => ({ ...s, aktif: v }))} hint="Jabatan nonaktif tidak memberi hak akses, tetapi tetap tercatat sebagai riwayat.">Jabatan aktif</Checkbox>
        {f.peran === 'ketua' && <Callout tone="warn">Ketua dapat menyetujui pengeluaran kas dan mengelola keuangan. Hanya Ketua tanpa wilayah blok yang dapat mengatur susunan pengurus.</Callout>}
      </div>
    </Modal>
  );
}

function Sel({ v }) {
  if (v === true) return <Check size={16} className="yes" aria-label="Ya" />;
  if (v === false) return <Minus size={16} className="no" aria-label="Tidak" />;
  return <span className="part">{v}</span>;
}

export default function KelolaPengurus() {
  const { user } = useAuth();
  const { namaGang, alamatPendek } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useAsync(() => daftarPengurus({ semua: true }), []);
  const w = useAsync(() => daftarWarga({ limit: 2000 }), []);
  const [form, setForm] = useState(null);
  const rows = useMemo(() => [...(s.data || [])].sort((a, b) => (b.aktif - a.aktif) || (URUT[a.peran] ?? 99) - (URUT[b.peran] ?? 99)), [s.data]);
  async function hapus(p) {
    const self = p.warga_id === user.id;
    if (!(await confirm({ title: `Cabut jabatan ${p.jabatan}?`, text: `${p.warga?.nama} kehilangan hak akses jabatan ini.${self ? ' Ini jabatan Anda sendiri.' : ''} Untuk menyimpan riwayat, ubah jabatan menjadi nonaktif saja.`, okLabel: 'Cabut jabatan', danger: true }))) return;
    try { await hapusPengurus(p.id); toast.success('Jabatan dicabut'); s.reload(); } catch (e) { toast.error(e); }
  }
  const cols = [
    { key: 'nama', label: 'Pengurus', mobileLabel: '', sort: (p) => p.warga?.nama, render: (p) => <div className="row"><Avatar nama={p.warga?.nama} path={p.warga?.foto_path} size={34} /><div style={{ textAlign: 'left' }}><div className="cell-main">{p.warga?.nama}</div><div className="cell-sub">{alamatPendek(p.warga)}</div></div></div> },
    { key: 'jabatan', label: 'Jabatan', sort: (p) => labelJabatan(p, namaGang), render: (p) => <span>{labelJabatan(p, namaGang)}</span> },
    { key: 'peran', label: 'Hak akses', sort: (p) => PERAN_PENGURUS[p.peran]?.label || p.peran, render: (p) => <Badge tone={p.peran === 'seksi' ? '' : 'brand'}>{PERAN_PENGURUS[p.peran]?.label || p.peran}</Badge> },
    { key: 'wil', label: 'Wilayah', sort: (p) => p.wilayah_blok || p.wilayah_gang || '', render: (p) => <span className="text-sm">{p.peran === 'humas' ? (namaGang(p.wilayah_gang) || '—') : PERAN_BLOK.includes(p.peran) ? (p.wilayah_blok ? `Blok ${p.wilayah_blok}` : 'Semua blok') : '—'}</span> },
    { key: 'periode', label: 'Periode', render: (p) => <span className="num nowrap">{p.periode_mulai || '—'}–{p.periode_selesai || '—'}</span> },
    { key: 'status', label: 'Status', sort: (p) => (p.aktif ? 0 : 1), render: (p) => <Badge tone={p.aktif ? 'ok' : ''} dot>{p.aktif ? 'Aktif' : 'Nonaktif'}</Badge> },
    { key: 'aksi', label: '', className: 'actions', render: (p) => <><IconButton small icon={Pencil} size={16} label="Ubah jabatan" onClick={() => setForm(p)} /><IconButton small danger icon={Trash2} size={16} label="Cabut jabatan" onClick={() => hapus(p)} /></> },
  ];
  return (
    <div className="page">
      <PageHeader back="/pengurus" title="Atur pengurus" desc="Tetapkan jabatan dan hak aksesnya. Hak akses mengikuti peran dan wilayah blok, bukan nama jabatan."
        actions={<Button size="sm" icon={Plus} onClick={() => setForm({})}>Tetapkan pengurus</Button>}
        mobileActions={<IconButton icon={Plus} label="Tetapkan pengurus" onClick={() => setForm({})} />} />
      <Card className="flush">
        {s.loading && !s.data ? <div className="card-body"><SkeletonRows n={5} /></div> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
          <DataTable columns={cols} rows={rows} caption="Daftar jabatan pengurus" empty={<EmptyState icon={Network} title="Belum ada pengurus" text="Tetapkan Ketua, Sekretaris, Bendahara, dan Humas tiap gang." />} />
        )}
      </Card>
      <Card>
        <CardHead title="Hak akses per peran" desc="Diterapkan otomatis di database (RLS)" />
        <div className="table-wrap">
          <table className="table matrix">
            <thead><tr><th>Tindakan</th><th>Ketua</th><th>Wakil</th><th>Sekretaris</th><th>Bendahara</th><th>Humas jalan</th></tr></thead>
            <tbody>{MATRIKS.map((m) => <tr key={m.aksi}><td className="text-sm">{m.aksi}</td>{['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas'].map((k) => <td key={k}><Sel v={m[k]} /></td>)}</tr>)}</tbody>
          </table>
        </div>
        <CardBody><p className="text-xs muted">Seksi/anggota pengurus dapat melihat arsip dan data pengurus, tanpa hak mengubah. Admin sistem memiliki semua akses serta pengaturan aplikasi.</p></CardBody>
      </Card>
      {form && <FormJabatan awal={form.id ? form : null} warga={w.data} onClose={() => setForm(null)} onSaved={() => { setForm(null); s.reload(); }} />}
    </div>
  );
}
