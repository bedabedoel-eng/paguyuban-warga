import { useState } from 'react';
import { Search, Pencil } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Loader, Modal, PasswordInput, PhoneInput, Select, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { semuaWarga, ubahWargaAdmin, ubahKontakAdmin, resetSandiWarga, hapusWarga } from '../../services/warga';
import { simpanPengurus, daftarPengurus, hapusPengurus } from '../../services/pengurus';
import { formatHp, normalizeHp } from '../../lib/phone';
import { PERAN, STATUS_WARGA } from '../../lib/constants';

function EditWarga({ w, onClose, onSaved }) {
  const { hak, user } = useAuth();
  const { blok } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState({ nama: w.nama, blok: w.blok || '', no_rumah: w.no_rumah || '', status: w.status, role: w.role === 'pengurus' ? 'warga' : w.role, kepala_keluarga: w.kepala_keluarga, hp: w.kontak?.nomor_hp ? w.kontak.nomor_hp.replace(/^62/, '') : '' });
  const [sandi, setSandi] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [loading, setLoading] = useState(false);
  const pengurus = useAsync(async () => (await daftarPengurus({ semua: true })).filter((p) => p.warga_id === w.id), [w.id]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const admin = hak.admin;

  async function simpan() {
    const hp = f.hp ? normalizeHp(f.hp) : null;
    if (f.hp && !hp) return toast.error('Nomor HP tidak valid');
    if (f.nama.trim().length < 2) return toast.error('Nama minimal 2 huruf');
    setLoading(true);
    try {
      const data = { nama: f.nama.trim(), blok: f.blok || null, no_rumah: f.no_rumah.trim().toUpperCase() || null, status: f.status, kepala_keluarga: !!f.kepala_keluarga };
      if (w.role !== 'pengurus' || f.role === 'admin') data.role = f.role;
      await ubahWargaAdmin(w.id, data);
      if (hp && hp !== w.kontak?.nomor_hp) await ubahKontakAdmin(w.id, { nomor_hp: hp });
      toast.success('Data warga disimpan'); onSaved();
    } catch (e) { toast.error(e); } finally { setLoading(false); }
  }
  async function reset() {
    if (sandi.length < 8) return toast.error('Kata sandi sementara minimal 8 karakter');
    try { await resetSandiWarga(w.id, sandi); toast.success('Kata sandi diatur ulang. Sampaikan ke warga.'); setSandi(''); } catch (e) { toast.error(e); }
  }
  async function jadiPengurus() {
    if (!jabatan.trim()) return toast.error('Isi jabatan');
    try {
      const y = new Date().getFullYear();
      const inti = /ketua|sekretaris|bendahara/i.test(jabatan);
      await simpanPengurus({ warga_id: w.id, jabatan: jabatan.trim(), inti, urutan: inti ? 5 : 20, periode_mulai: y, periode_selesai: y + 2 });
      toast.success('Ditambahkan sebagai pengurus'); setJabatan(''); pengurus.reload(); onSaved(false);
    } catch (e) { toast.error(e); }
  }
  async function cabut(p) {
    try { await hapusPengurus(p.id); toast.success('Jabatan dicabut'); pengurus.reload(); onSaved(false); } catch (e) { toast.error(e); }
  }
  async function hapus() {
    if (!(await confirm({ title: 'Hapus akun warga?', text: `Akun ${w.nama} beserta datanya akan dihapus permanen.`, okLabel: 'Hapus', danger: true }))) return;
    try { await hapusWarga(w.id); toast.success('Akun dihapus'); onSaved(); } catch (e) { toast.error(e); }
  }
  return (
    <Modal open onClose={onClose} title="Ubah Data Warga" wide footer={<><Button variant="outline" onClick={onClose}>Tutup</Button><Button loading={loading} onClick={simpan}>Simpan</Button></>}>
      <div className="stack">
        <Input label="Nama" value={f.nama} onChange={set('nama')} maxLength={80} />
        <div className="form-grid">
          <Select label="Blok" value={f.blok} onChange={set('blok')} placeholder="Pilih blok" options={blok.map((b) => ({ value: b.kode, label: b.nama }))} disabled={!admin} />
          <Input label="No. rumah" value={f.no_rumah} onChange={set('no_rumah')} maxLength={6} disabled={!admin} />
          <PhoneInput label="Nomor HP (login)" value={f.hp} onChange={set('hp')} disabled={!admin} />
          <Select label="Status" value={f.status} onChange={set('status')} options={['menunggu', 'aktif', 'ditolak', 'nonaktif'].map((x) => ({ value: x, label: STATUS_WARGA[x].label }))} disabled={!admin || w.id === user.id} />
          {admin && w.id !== user.id && <Select label="Peran sistem" value={f.role} onChange={set('role')} options={[{ value: 'warga', label: 'Warga' }, { value: 'admin', label: 'Admin' }]} hint="Pengurus ditentukan lewat jabatan di bawah" />}
          <label className="checkbox" style={{ alignSelf: 'end', height: 42 }}><input type="checkbox" checked={!!f.kepala_keluarga} onChange={(e) => setF((s) => ({ ...s, kepala_keluarga: e.target.checked }))} disabled={!admin} />Kepala keluarga</label>
        </div>
        {!admin && <Alert tone="info">Perubahan data rumah, nomor HP, dan peran hanya dapat dilakukan admin.</Alert>}
        {admin && (
          <>
            <div className="divider" />
            <h3>Jabatan Pengurus</h3>
            {pengurus.data?.map((p) => <div key={p.id} className="row between"><span><b>{p.jabatan}</b> <span className="small muted">{p.periode_mulai}-{p.periode_selesai}</span></span><Button size="xs" variant="danger-outline" onClick={() => cabut(p)}>Cabut</Button></div>)}
            <div className="row"><div className="grow"><input className="input" placeholder="Contoh: Bendahara, Seksi Keamanan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} maxLength={60} aria-label="Jabatan" /></div><Button variant="outline" onClick={jadiPengurus}>Tambah</Button></div>
            <p className="tiny muted">Jabatan mengandung kata “Bendahara” atau “Ketua” otomatis dapat mengelola IPL dan kas.</p>
            <div className="divider" />
            <h3>Atur Ulang Kata Sandi</h3>
            <div className="row"><div className="grow"><PasswordInput placeholder="Kata sandi sementara (min. 8)" value={sandi} onChange={(e) => setSandi(e.target.value)} /></div><Button variant="outline" onClick={reset}>Atur Ulang</Button></div>
            {w.id !== user.id && <><div className="divider" /><Button variant="danger-outline" onClick={hapus}>Hapus Akun Warga</Button></>}
          </>
        )}
      </div>
    </Modal>
  );
}

export default function DataWarga() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounce(q.trim(), 300);
  const s = useAsync(() => semuaWarga({ status, q: dq }), [status, dq]);
  const [edit, setEdit] = useState(null);
  return (
    <>
      <PageHeader title="Data Warga" />
      <div className="page">
        <div className="page-inner">
          <div className="row wrap">
            <div className="input-icon grow" style={{ minWidth: 200 }}><Search size={18} /><input className="input" type="search" placeholder="Cari nama..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari warga" /></div>
            <select className="select sm" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status"><option value="">Semua status</option>{Object.entries(STATUS_WARGA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </div>
          <Card>
            {s.loading && !s.data ? <Loader /> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : !s.data?.length ? <EmptyState title="Tidak ada data" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Nama</th><th>Rumah</th><th className="desktop-only">Nomor HP</th><th>Peran</th><th>Status</th><th /></tr></thead>
                  <tbody>{s.data.map((w) => (
                    <tr key={w.id}>
                      <td><div className="row"><Avatar nama={w.nama} path={w.foto_path} size={34} /><b>{w.nama}</b></div></td>
                      <td className="nowrap">{w.blok ? `${w.blok}-${w.no_rumah}` : '-'}</td>
                      <td className="desktop-only nowrap">{w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : '-'}</td>
                      <td>{PERAN[w.role]}</td>
                      <td><Badge tone={STATUS_WARGA[w.status].tone}>{STATUS_WARGA[w.status].label}</Badge></td>
                      <td><Button size="xs" variant="outline" icon={Pencil} onClick={() => setEdit(w)}>Ubah</Button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
      {edit && <EditWarga w={edit} onClose={() => setEdit(null)} onSaved={(tutup = true) => { if (tutup) setEdit(null); s.reload(); }} />}
    </>
  );
}
