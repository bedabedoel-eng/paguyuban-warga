import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Pencil, FileUp, Users, KeyRound, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, SkeletonRows, Input, Modal, PinInput, PhoneInput, Select, SearchInput, Checkbox, Callout, DataTable, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { semuaWarga, ubahWargaAdmin, ubahKontakAdmin, resetSandiWarga, hapusWarga } from '../../services/warga';
import { daftarPengurus } from '../../services/pengurus';
import { formatHp, normalizeHp } from '../../lib/phone';
import { STATUS_WARGA } from '../../lib/constants';
import { kelolaWilayah } from '../../lib/akses';

function EditWarga({ w, onClose, onSaved }) {
  const { hak, user } = useAuth();
  const { blok } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const admin = hak.admin;
  const [f, setF] = useState({ nama: w.nama, blok: w.blok || '', no_rumah: w.no_rumah || '', status: w.status, role: w.role === 'admin' ? 'admin' : 'warga', kepala_keluarga: w.kepala_keluarga, pekerjaan: w.pekerjaan || '', hp: w.kontak?.nomor_hp ? w.kontak.nomor_hp.replace(/^62/, '') : '' });
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const jab = useAsync(async () => (await daftarPengurus()).filter((p) => p.warga_id === w.id), [w.id]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const diriSendiri = w.id === user.id;
  const terkunci = w.role === 'admin' && !admin;
  const opsiBlok = blok.filter((b) => hak.kelola_anggota || hak.wilayah.includes(b.kode)).map((b) => ({ value: b.kode, label: b.nama }));

  async function simpan() {
    const hp = f.hp ? normalizeHp(f.hp) : null;
    if (admin && f.hp && !hp) return toast.error('Nomor HP tidak valid');
    if (f.nama.trim().length < 2) return toast.error('Nama minimal 2 huruf');
    setLoading(true);
    try {
      const data = { nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, blok: f.blok || null, no_rumah: f.no_rumah.trim().toUpperCase() || null, kepala_keluarga: !!f.kepala_keluarga };
      if (!diriSendiri) data.status = f.status;
      if (admin && !diriSendiri && w.role !== 'pengurus') data.role = f.role;
      await ubahWargaAdmin(w.id, data);
      if (admin && hp && hp !== w.kontak?.nomor_hp) await ubahKontakAdmin(w.id, { nomor_hp: hp });
      toast.success('Data anggota disimpan'); onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  async function reset() {
    if (!/^\d{6}$/.test(pin)) return toast.error('PIN sementara harus 6 angka');
    try { await resetSandiWarga(w.id, pin); toast.success('PIN diatur ulang. Sampaikan PIN sementara langsung ke warga.'); setPin(''); } catch (e) { toast.error(e); }
  }
  async function hapus() {
    if (!(await confirm({ title: `Hapus akun ${w.nama}?`, text: 'Akun, profil, dan riwayat pembayaran warga ini dihapus permanen. Tindakan ini tidak bisa dibatalkan.', okLabel: 'Hapus permanen', danger: true }))) return;
    try { await hapusWarga(w.id); toast.success('Akun dihapus'); onSaved(); } catch (e) { toast.error(e); }
  }

  return (
    <Modal open onClose={onClose} title="Ubah data anggota" desc={w.nama} wide
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={loading} disabled={terkunci} onClick={simpan}>Simpan perubahan</Button></>}>
      <div className="stack">
        {terkunci && <Callout tone="warn">Data akun admin hanya dapat diubah oleh admin.</Callout>}
        <div className="form-section">
          <div className="form-grid">
            <Input fieldClass="span-2" label="Nama lengkap" value={f.nama} onChange={set('nama')} maxLength={80} disabled={terkunci} />
            <Select label="Gang / blok" value={f.blok} onChange={set('blok')} placeholder="Pilih" options={opsiBlok} disabled={terkunci} />
            <Input label="Nomor rumah" value={f.no_rumah} onChange={set('no_rumah')} maxLength={6} disabled={terkunci} />
            <Input label="Pekerjaan" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} disabled={terkunci} />
            <Select label="Status keanggotaan" value={f.status} onChange={set('status')} options={['menunggu', 'aktif', 'ditolak', 'nonaktif'].map((x) => ({ value: x, label: STATUS_WARGA[x].label }))} disabled={terkunci || diriSendiri} />
            <div className="span-2"><Checkbox checked={f.kepala_keluarga} onChange={(v) => setF((s) => ({ ...s, kepala_keluarga: v }))} disabled={terkunci}>Kepala keluarga</Checkbox></div>
          </div>
        </div>
        <div className="form-section">
          <div className="form-section-head"><h3>Akun & jabatan</h3><p>{admin ? 'Nomor HP dipakai untuk masuk.' : 'Nomor HP, PIN, dan peran sistem hanya diubah admin.'}</p></div>
          <div className="form-grid">
            <PhoneInput label="Nomor HP (login)" value={f.hp} onChange={set('hp')} disabled={!admin} />
            {admin && !diriSendiri && w.role !== 'pengurus' && <Select label="Peran sistem" value={f.role} onChange={set('role')} options={[{ value: 'warga', label: 'Warga' }, { value: 'admin', label: 'Admin (akses penuh)' }]} />}
          </div>
          <div className="row wrap">
            {jab.data?.length ? jab.data.map((j) => <Badge key={j.id} tone="brand">{j.jabatan}{j.wilayah_blok ? ` · Gang ${j.wilayah_blok}` : ''}</Badge>) : <span className="text-sm muted">Tidak memegang jabatan pengurus.</span>}
            {hak.kelola_pengurus && <Link to="/pengurus/kelola" className="link">Atur jabatan</Link>}
          </div>
        </div>
        {admin && (
          <div className="form-section">
            <div className="form-section-head"><h3>Atur ulang PIN</h3><p>Warga wajib membuat PIN baru saat masuk berikutnya.</p></div>
            <div className="row row-top wrap">
              <div className="grow" style={{ minWidth: 180 }}><PinInput placeholder="PIN sementara (6 angka)" value={pin} onChange={(e) => setPin(e.target.value)} /></div>
              <Button variant="secondary" icon={KeyRound} onClick={reset}>Atur ulang PIN</Button>
            </div>
            {!diriSendiri && <div><Button variant="danger-soft" icon={Trash2} onClick={hapus}>Hapus akun warga</Button></div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function DataWarga() {
  const { hak } = useAuth();
  const { blok } = useSettings();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const fb = params.get('blok') || (hak.kelola_anggota ? '' : hak.wilayah[0] || '');
  const dq = useDebounce(q.trim(), 300);
  const belumPin = status === 'belum_pin';
  const s = useAsync(async () => {
    const rows = await semuaWarga({ status: belumPin ? '' : status, q: dq, blok: fb });
    return belumPin ? rows.filter((x) => x.wajib_ganti_pin) : rows;
  }, [status, dq, fb]);
  const [edit, setEdit] = useState(null);
  const opsiBlok = useMemo(() => blok.filter((b) => hak.kelola_anggota || hak.wilayah.includes(b.kode)), [blok, hak]);

  const cols = [
    { key: 'nama', label: 'Nama', mobileLabel: '', render: (w) => (
      <div className="row"><Avatar nama={w.nama} path={w.foto_path} size={36} /><div className="grow" style={{ textAlign: 'left' }}><div className="cell-main">{w.nama}</div><div className="cell-sub">{w.pekerjaan || (w.kepala_keluarga ? 'Kepala keluarga' : 'Anggota keluarga')}</div></div></div>
    ) },
    { key: 'rumah', label: 'Rumah', render: (w) => <span className="nowrap">{w.blok ? `${w.blok}-${w.no_rumah}` : '—'}</span> },
    { key: 'hp', label: 'Nomor HP', render: (w) => <span className="num nowrap">{w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : '—'}</span> },
    { key: 'status', label: 'Status', render: (w) => (
      <span className="row wrap" style={{ gap: 6, justifyContent: 'inherit' }}>
        <Badge tone={STATUS_WARGA[w.status].tone} dot>{STATUS_WARGA[w.status].label}</Badge>
        {w.role === 'admin' && <Badge tone="violet">Admin</Badge>}
        {w.wajib_ganti_pin && <Badge tone="warn">Belum ganti PIN</Badge>}
      </span>
    ) },
    { key: 'aksi', label: '', className: 'actions', render: (w) => kelolaWilayah(hak, w.blok) || hak.admin
      ? <Button size="xs" variant="secondary" icon={Pencil} onClick={() => setEdit(w)}>Ubah</Button> : null },
  ];

  return (
    <div className="page">
      <PageHeader back title="Data anggota" desc={hak.kelola_anggota ? 'Seluruh anggota paguyuban. Ubah data rumah, status, dan kepala keluarga.' : `Anggota di Gang ${hak.wilayah.join(', ')}.`}
        actions={hak.admin ? <Button size="sm" variant="secondary" icon={FileUp} to="/admin/import">Import dari CSV</Button> : undefined} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama anggota" />
        <Select className="sm" value={fb} onChange={(e) => setParams(e.target.value ? { blok: e.target.value } : {})} placeholder={hak.kelola_anggota ? 'Semua gang' : undefined} options={opsiBlok.map((b) => ({ value: b.kode, label: b.nama }))} aria-label="Filter gang" />
        <Select className="sm" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Semua status" options={[...Object.entries(STATUS_WARGA).map(([k, v]) => ({ value: k, label: v.label })), { value: 'belum_pin', label: 'Belum ganti PIN' }]} aria-label="Filter status" />
      </div>
      <Card className="flush">
        {s.loading && !s.data ? <div className="card-body"><SkeletonRows n={5} /></div> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
          <DataTable columns={cols} rows={s.data} caption="Daftar anggota"
            empty={<EmptyState icon={Users} title="Tidak ada anggota yang cocok" text="Ubah kata kunci atau filter." />} />
        )}
        {s.data?.length > 0 && <div className="card-foot text-sm muted">{s.data.length} anggota</div>}
      </Card>
      {edit && <EditWarga w={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); s.reload(); }} />}
    </div>
  );
}
