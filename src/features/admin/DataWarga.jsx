import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Pencil, FileUp, Users, KeyRound, Trash2, Download } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, SkeletonRows, Input, Modal, PinInput, PhoneInput, Select, SearchInput, Checkbox, Callout, DataTable, IconButton, FotoInput, PernikahanFields, galatAnak, kolomPernikahan, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { semuaWarga, ubahWargaAdmin, ubahKontakAdmin, resetSandiWarga, hapusWarga } from '../../services/warga';
import { daftarPengurus } from '../../services/pengurus';
import { formatHp, normalizeHp } from '../../lib/phone';
import { STATUS_WARGA, STATUS_PERNIKAHAN, pernahMenikah, labelPernikahan } from '../../lib/constants';
import { FOTO_AWAL, fotoBerubah, terapkanFoto } from '../../lib/foto';
import { tanggal } from '../../lib/format';
import { kelolaWilayah, namaWilayah, labelJabatan } from '../../lib/akses';
import { POLA_NOMOR_RUMAH, gangDiBlok } from '../../lib/alamat';
import { eksporWarga } from '../../lib/eksporWarga';

function EditWarga({ w, onClose, onSaved }) {
  const { hak, user } = useAuth();
  const { blok, gang, namaGang } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const admin = hak.admin;
  const [f, setF] = useState({ nama: w.nama, blok: w.blok || '', gang_id: w.gang_id || '', no_rumah: w.no_rumah || '', status: w.status, role: w.role === 'admin' ? 'admin' : 'warga', kepala_keluarga: w.kepala_keluarga, pekerjaan: w.pekerjaan || '', hp: w.kontak?.nomor_hp ? w.kontak.nomor_hp.replace(/^62/, '') : '', status_pernikahan: w.kontak?.status_pernikahan || '', jumlah_anak: w.kontak?.jumlah_anak ?? '' });
  const [foto, setFoto] = useState(FOTO_AWAL);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const jab = useAsync(async () => (await daftarPengurus()).filter((p) => p.warga_id === w.id), [w.id]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const diriSendiri = w.id === user.id;
  const terkunci = w.role === 'admin' && !admin;
  const opsiBlok = blok.map((b) => ({ value: b.kode, label: b.nama }));
  const opsiGang = gangDiBlok(gang, f.blok).filter((g) => hak.kelola_anggota || hak.wilayah.includes(g.id)).map((g) => ({ value: g.id, label: g.nama }));
  const gantiBlok = (e) => { const b = e.target.value; setF((s) => ({ ...s, blok: b, gang_id: gangDiBlok(gang, b).some((g) => g.id === s.gang_id) ? s.gang_id : '' })); };

  async function simpan() {
    const hp = f.hp ? normalizeHp(f.hp) : null;
    if (admin && f.hp && !hp) return toast.error('Nomor HP tidak valid');
    if (f.nama.trim().length < 2) return toast.error('Nama minimal 2 huruf');
    if (f.no_rumah.trim() && !POLA_NOMOR_RUMAH.test(f.no_rumah.trim())) return toast.error('Nomor rumah: angka/huruf, boleh dengan / . - (mis. 3/5)');
    if (!hak.kelola_anggota && !f.gang_id) return toast.error('Pilih jalan');
    const ga = galatAnak(f.status_pernikahan, f.jumlah_anak);
    if (ga) return toast.error(ga);
    setLoading(true);
    try {
      const data = { nama: f.nama.trim(), pekerjaan: f.pekerjaan.trim() || null, blok: f.blok || null, gang_id: f.gang_id || null, no_rumah: f.no_rumah.trim().toUpperCase() || null, kepala_keluarga: !!f.kepala_keluarga };
      if (!diriSendiri) data.status = f.status;
      if (admin && fotoBerubah(foto)) data.foto_path = await terapkanFoto(foto, { folder: `avatar/${user.id}`, lama: w.foto_path, opsi: { maxSize: 960, quality: 0.82, aspect: 3 / 4 } });
      if (admin && !diriSendiri && w.role !== 'pengurus') data.role = f.role;
      await ubahWargaAdmin(w.id, data);
      const kontakBaru = { ...kolomPernikahan(f.status_pernikahan, f.jumlah_anak) };
      if (admin && hp && hp !== w.kontak?.nomor_hp) kontakBaru.nomor_hp = hp;
      await ubahKontakAdmin(w.id, kontakBaru);
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
            <Select label="Blok" value={f.blok} onChange={gantiBlok} placeholder="Pilih" options={opsiBlok} disabled={terkunci || !hak.kelola_anggota} />
            <Input label="Nomor rumah" value={f.no_rumah} onChange={set('no_rumah')} maxLength={10} placeholder="Contoh: 3/5" disabled={terkunci} />
            {(opsiGang.length > 0 || f.gang_id) && (
              <Select fieldClass="span-2" label="Jalan" value={f.gang_id} onChange={set('gang_id')}
                placeholder={hak.kelola_anggota ? 'Belum dipilih' : undefined}
                options={opsiGang.some((o) => o.value === f.gang_id) || !f.gang_id ? opsiGang : [{ value: f.gang_id, label: namaGang(f.gang_id) || 'Gang lain' }, ...opsiGang]}
                disabled={terkunci} hint="Menentukan humas yang mendampingi warga ini." />
            )}
            <Input label="Pekerjaan" optional value={f.pekerjaan} onChange={set('pekerjaan')} maxLength={60} disabled={terkunci} />
            <Select label="Status keanggotaan" value={f.status} onChange={set('status')} options={['menunggu', 'aktif', 'ditolak', 'nonaktif'].map((x) => ({ value: x, label: STATUS_WARGA[x].label }))} disabled={terkunci || diriSendiri} />
            <PernikahanFields status={f.status_pernikahan} anak={f.jumlah_anak} disabled={terkunci}
              onStatus={(v) => setF((s) => ({ ...s, status_pernikahan: v, jumlah_anak: pernahMenikah(v) ? s.jumlah_anak : '' }))}
              onAnak={(v) => setF((s) => ({ ...s, jumlah_anak: v }))} />
            <div className="span-2"><Checkbox checked={f.kepala_keluarga} onChange={(v) => setF((s) => ({ ...s, kepala_keluarga: v }))} disabled={terkunci}>Kepala keluarga</Checkbox></div>
          </div>
        </div>
        {admin && !terkunci && (
          <div className="form-section">
            <div className="form-section-head"><h3>Pas foto</h3><p>Unggah dari perangkat atau tempel tautan gambar.</p></div>
            <FotoInput value={foto} onChange={setFoto} adaFoto={!!w.foto_path} />
          </div>
        )}
        <div className="form-section">
          <div className="form-section-head"><h3>Akun & jabatan</h3><p>{admin ? 'Nomor HP dipakai untuk masuk.' : 'Nomor HP, PIN, dan peran sistem hanya diubah admin.'}</p></div>
          <div className="form-grid">
            <PhoneInput label="Nomor HP (login)" value={f.hp} onChange={set('hp')} disabled={!admin} />
            {admin && !diriSendiri && w.role !== 'pengurus' && <Select label="Peran sistem" value={f.role} onChange={set('role')} options={[{ value: 'warga', label: 'Warga' }, { value: 'admin', label: 'Admin (akses penuh)' }]} />}
          </div>
          <div className="row wrap">
            {jab.data?.length ? jab.data.map((j) => <Badge key={j.id} tone="brand">{labelJabatan(j, namaGang)}</Badge>) : <span className="text-sm muted">Tidak memegang jabatan pengurus.</span>}
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
  const { blok, gang, alamatPendek } = useSettings();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [nikah, setNikah] = useState('');
  // Filter wilayah: ?blok=C atau ?gang=<id>. Humas otomatis melihat jalannya.
  const fg = params.get('gang') || (hak.kelola_anggota ? '' : hak.wilayah[0] || '');
  const fb = fg ? '' : params.get('blok') || '';
  const fw = fg ? `g:${fg}` : fb ? `b:${fb}` : '';
  const dq = useDebounce(q.trim(), 300);
  const belumPin = status === 'belum_pin';
  const s = useAsync(async () => {
    const rows = await semuaWarga({ status: belumPin ? '' : status, q: dq, blok: fb, gang: fg });
    return belumPin ? rows.filter((x) => x.wajib_ganti_pin) : rows;
  }, [status, dq, fb, fg]);
  const tampil = useMemo(() => (s.data || []).filter((x) => !nikah || (nikah === 'kosong' ? !x.kontak?.status_pernikahan : x.kontak?.status_pernikahan === nikah)), [s.data, nikah]);
  const totalAnak = useMemo(() => tampil.reduce((a, x) => a + (x.kontak?.jumlah_anak || 0), 0), [tampil]);
  const jumlahMenikah = useMemo(() => tampil.filter((x) => x.kontak?.status_pernikahan === 'menikah').length, [tampil]);
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  function ekspor() {
    if (!tampil.length) return toast.error('Tidak ada data untuk diekspor');
    const n = eksporWarga(tampil, gang, 'data-anggota');
    toast.success(`${n} anggota diekspor ke CSV (sesuai filter)`);
  }
  const opsiWilayah = useMemo(() => {
    const g = gang.filter((x) => hak.kelola_anggota || hak.wilayah.includes(x.id));
    if (!hak.kelola_anggota) return g.map((x) => ({ value: `g:${x.id}`, label: x.nama }));
    return blok.flatMap((b) => [{ value: `b:${b.kode}`, label: b.nama }, ...g.filter((x) => x.blok === b.kode).map((x) => ({ value: `g:${x.id}`, label: `${b.nama} · ${x.nama}` }))])
      .concat(g.filter((x) => !x.blok).map((x) => ({ value: `g:${x.id}`, label: x.nama })));
  }, [blok, gang, hak]);
  const gantiWilayah = (v) => setParams(v.startsWith('g:') ? { gang: v.slice(2) } : v.startsWith('b:') ? { blok: v.slice(2) } : {});

  const cols = [
    { key: 'nama', label: 'Nama', mobileLabel: '', sort: (w) => w.nama, render: (w) => (
      <div className="row"><Avatar nama={w.nama} path={w.foto_path} size={36} /><div className="grow" style={{ textAlign: 'left' }}><div className="cell-main">{w.nama}</div><div className="cell-sub">{w.pekerjaan || (w.kepala_keluarga ? 'Kepala keluarga' : 'Anggota keluarga')}</div></div></div>
    ) },
    { key: 'rumah', label: 'Alamat', sort: (w) => (w.blok ? `${w.blok} ${w.no_rumah || ''}` : ''), render: (w) => <span>{w.blok ? alamatPendek(w) : '—'}</span> },
    { key: 'nikah', label: 'Pernikahan', sort: (w) => w.kontak?.status_pernikahan || '', render: (w) => <span className="text-sm">{labelPernikahan(w.kontak) || '—'}</span> },
    { key: 'hp', label: 'Nomor HP', render: (w) => <span className="num nowrap">{w.kontak?.nomor_hp ? formatHp(w.kontak.nomor_hp) : '—'}</span> },
    { key: 'bergabung', label: 'Bergabung', sort: (w) => w.bergabung_at, render: (w) => <span className="nowrap text-sm">{w.bergabung_at ? tanggal(w.bergabung_at, { pendek: true }) : '—'}</span> },
    { key: 'status', label: 'Status', sort: (w) => STATUS_WARGA[w.status]?.label, render: (w) => (
      <span className="row wrap" style={{ gap: 6, justifyContent: 'inherit' }}>
        <Badge tone={STATUS_WARGA[w.status].tone} dot>{STATUS_WARGA[w.status].label}</Badge>
        {w.role === 'admin' && <Badge tone="violet">Admin</Badge>}
        {w.wajib_ganti_pin && <Badge tone="warn">Belum ganti PIN</Badge>}
      </span>
    ) },
    { key: 'aksi', label: '', className: 'actions', render: (w) => kelolaWilayah(hak, w.gang_id) || hak.admin
      ? <Button size="xs" variant="secondary" icon={Pencil} onClick={() => setEdit(w)}>Ubah</Button> : null },
  ];

  return (
    <div className="page">
      <PageHeader back title="Data anggota" desc={hak.kelola_anggota ? 'Seluruh anggota paguyuban. Ubah data rumah, status, dan kepala keluarga.' : `Anggota di ${namaWilayah(hak, gang)}.`}
        actions={<><Button size="sm" variant="secondary" icon={Download} onClick={ekspor}>Ekspor CSV</Button>{hak.admin && <Button size="sm" variant="secondary" icon={FileUp} to="/admin/import">Import dari CSV</Button>}</>}
        mobileActions={<><IconButton icon={Download} label="Ekspor CSV" onClick={ekspor} />{hak.admin && <IconButton icon={FileUp} label="Import dari CSV" to="/admin/import" />}</>} />
      <div className="toolbar">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama anggota" />
        <Select className="sm" value={fw} onChange={(e) => gantiWilayah(e.target.value)} placeholder={hak.kelola_anggota ? 'Semua blok & jalan' : undefined} options={opsiWilayah} aria-label="Filter blok atau jalan" />
        <Select className="sm" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Semua status" options={[...Object.entries(STATUS_WARGA).map(([k, v]) => ({ value: k, label: v.label })), { value: 'belum_pin', label: 'Belum ganti PIN' }]} aria-label="Filter status" />
        <Select className="sm" value={nikah} onChange={(e) => setNikah(e.target.value)} placeholder="Semua status pernikahan" aria-label="Filter status pernikahan"
          options={[...Object.entries(STATUS_PERNIKAHAN).map(([k, v]) => ({ value: k, label: v.label })), { value: 'kosong', label: 'Belum diisi' }]} />
      </div>
      <Card className="flush">
        {s.loading && !s.data ? <div className="card-body"><SkeletonRows n={5} /></div> : s.error ? <ErrorState error={s.error} onRetry={s.reload} /> : (
          <DataTable columns={cols} rows={tampil} caption="Daftar anggota"
            empty={<EmptyState icon={Users} title="Tidak ada anggota yang cocok" text="Ubah kata kunci atau filter." />} />
        )}
        {tampil.length > 0 && <div className="card-foot text-sm muted">{tampil.length} anggota · {jumlahMenikah} menikah · {totalAnak} anak tercatat (data sensus)</div>}
      </Card>
      {edit && <EditWarga w={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); s.reload(); }} />}
    </div>
  );
}
