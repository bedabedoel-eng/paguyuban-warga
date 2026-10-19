import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Signpost, Users, Download, FileUp } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardHead, IconButton, Input, Select, Modal, Callout, EmptyState, Badge, useConfirm } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { simpanGang, hapusGang } from '../../services/pengaturan';
import { sebaranWarga } from '../../services/warga';
import ImportWilayah, { KOLOM_WILAYAH } from './ImportWilayah';
import { toCsv, unduhBerkas, stempelTanggal } from '../../lib/csv';

const g_ada_nomor = (daftar, id) => !!daftar.find((x) => x.id === id)?.nomor;

/** Daftar jalan di setiap blok. Dikelola pimpinan & sekretaris. */
export default function WilayahGang() {
  const { hak } = useAuth();
  const { blok, gang, reload } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const sebar = useAsync(sebaranWarga, [gang.length]);
  const [baru, setBaru] = useState({});
  const [ubah, setUbah] = useState(null);
  const [busy, setBusy] = useState(false);
  const [impor, setImpor] = useState(false);
  const jml = (id) => sebar.data?.gang[id] || 0;

  async function tambah(kodeBlok) {
    const nama = (baru[kodeBlok] || '').trim();
    if (nama.length < 2) return toast.error('Tulis nama jalan, mis. Jl. Zamrud');
    setBusy(true);
    try {
      await simpanGang({ nama, blok: kodeBlok || null, urutan: gang.length + 1 });
      setBaru((s) => ({ ...s, [kodeBlok]: '' })); await reload(); toast.success(`${nama} ditambahkan`);
    } catch (e) { toast.error(/duplicate|unik|unique/i.test(e?.message || '') ? 'Nama itu sudah ada di blok ini' : e); } finally { setBusy(false); }
  }
  async function simpanUbah() {
    if (ubah.nama.trim().length < 2) return toast.error('Nama terlalu pendek');
    setBusy(true);
    try { await simpanGang({ id: ubah.id, nama: ubah.nama.trim(), blok: ubah.blok || null, ...(ubah.nomor || g_ada_nomor(gang, ubah.id) ? { nomor: (ubah.nomor || '').trim() || null } : {}) }); setUbah(null); await reload(); toast.success('Jalan diperbarui'); }
    catch (e) { toast.error(e); } finally { setBusy(false); }
  }
  async function hapus(g) {
    const n = jml(g.id);
    if (!(await confirm({ title: `Hapus ${g.nama}?`, text: n ? `${n} warga di jalan ini akan menjadi "belum memilih jalan", dan humas jalan ini kehilangan wilayahnya.` : 'Jalan ini belum memiliki warga.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusGang(g.id); await reload(); toast.success('Jalan dihapus'); } catch (e) { toast.error(e); }
  }

  function ekspor() {
    const baris = [];
    for (const b of blok) {
      const gb = gang.filter((g) => g.blok === b.kode);
      if (!gb.length) baris.push({ blok: b.kode, nomor: '', gang: '', warga: sebar.data?.blok?.[b.kode] || 0 });
      for (const g of gb) baris.push({ blok: b.kode, nomor: g.nomor || '', gang: g.nama, warga: jml(g.id) });
    }
    for (const g of gang.filter((x) => !x.blok)) baris.push({ blok: '', nomor: g.nomor || '', gang: g.nama, warga: jml(g.id) });
    if (!baris.length) return toast.error('Belum ada data untuk diekspor');
    unduhBerkas(`blok-jalan-${stempelTanggal()}.csv`, toCsv(baris, [...KOLOM_WILAYAH, { key: 'warga', label: 'warga_aktif' }]));
    toast.success(`${baris.length} baris diekspor ke CSV`);
  }

  const kelompok = [...blok.map((b) => ({ kode: b.kode, nama: b.nama })), { kode: '', nama: 'Lintas blok' }];
  const Baris = ({ g }) => (
    <div className="rowi">
      <span className="ico sm"><Signpost size={16} /></span>
      <span className="rowi-main"><span className="rowi-title">{g.nama}</span>
        <span className="rowi-sub">{g.nomor ? `Nomor ${g.nomor} · ` : ''}{sebar.data ? `${jml(g.id)} warga aktif` : '…'}</span></span>
      <span className="rowi-end">
        <Button size="xs" variant="ghost" to={`/admin/warga?gang=${g.id}`} icon={Users}>Warga</Button>
        <IconButton small icon={Pencil} size={15} label={`Ubah ${g.nama}`} onClick={() => setUbah({ ...g, blok: g.blok || '' })} />
        <IconButton small danger icon={Trash2} size={15} label={`Hapus ${g.nama}`} onClick={() => hapus(g)} />
      </span>
    </div>
  );

  return (
    <div className="page medium">
      <PageHeader back title="Blok & jalan" desc="Setiap blok dapat berisi beberapa nama jalan. Jalan menentukan humas yang mendampingi warga dan sasaran informasi."
        actions={<><Button size="sm" variant="secondary" icon={Download} onClick={ekspor}>Ekspor CSV</Button><Button size="sm" variant="secondary" icon={FileUp} onClick={() => setImpor(true)}>Impor CSV</Button></>}
        mobileActions={<><IconButton icon={Download} label="Ekspor CSV" onClick={ekspor} /><IconButton icon={FileUp} label="Impor CSV" onClick={() => setImpor(true)} /></>} />
      <Callout tone="info">
        Contoh alamat: <b>Blok C 3/5 · Jl. Zamrud</b>. Warga memilih jalan saat mendaftar; data warga lama dapat dilengkapi di <Link to="/admin/warga">Data anggota</Link>.
        {hak.admin ? <> Daftar blok diatur di <Link to="/admin/pengaturan">Pengaturan paguyuban</Link>.</> : ' Daftar blok diatur admin.'}
      </Callout>
      {!blok.length && <Card><EmptyState icon={Signpost} title="Belum ada blok" text="Admin perlu menambahkan blok terlebih dahulu di Pengaturan paguyuban." /></Card>}
      {kelompok.map((b) => {
        const daftar = gang.filter((g) => (g.blok || '') === b.kode);
        if (!b.kode && !daftar.length) return null;
        const tanpa = b.kode ? sebar.data?.tanpaGang[b.kode] || 0 : 0;
        return (
          <Card key={b.kode || 'lintas'}>
            <CardHead title={b.nama} desc={b.kode ? `${daftar.length} jalan` : 'Jalan yang melintasi beberapa blok'}
              action={tanpa > 0 ? <Link to={`/admin/warga?blok=${b.kode}`}><Badge tone="warn">{tanpa} warga belum memilih jalan</Badge></Link> : null} />
            <div className="rows inset">
              {daftar.map((g) => <Baris key={g.id} g={g} />)}
              {!daftar.length && <p className="text-sm muted" style={{ padding: '4px 20px 12px' }}>Belum ada jalan. Bila blok ini tidak dibagi per jalan, biarkan kosong.</p>}
            </div>
            {b.kode && (
              <form className="card-foot row wrap row-top" onSubmit={(e) => { e.preventDefault(); tambah(b.kode); }}>
                <Input fieldClass="grow" placeholder="Nama jalan, mis. Jl. Zamrud" value={baru[b.kode] || ''} maxLength={60}
                  onChange={(e) => setBaru((s) => ({ ...s, [b.kode]: e.target.value }))} aria-label={`Jalan baru di ${b.nama}`} />
                <Button type="submit" icon={Plus} variant="secondary" loading={busy}>Tambah</Button>
              </form>
            )}
          </Card>
        );
      })}
      <ImportWilayah open={impor} onClose={() => setImpor(false)} />
      <Modal open={!!ubah} onClose={() => setUbah(null)} title="Ubah jalan"
        footer={<><Button variant="secondary" onClick={() => setUbah(null)}>Batal</Button><Button loading={busy} onClick={simpanUbah}>Simpan</Button></>}>
        {ubah && (
          <div className="stack">
            <Input label="Nama jalan" value={ubah.nama} maxLength={60} onChange={(e) => setUbah((s) => ({ ...s, nama: e.target.value }))} />
            <Input label="Nomor (opsional)" value={ubah.nomor || ''} maxLength={80} placeholder="mis. 3, 4 atau 1-20" onChange={(e) => setUbah((s) => ({ ...s, nomor: e.target.value }))}
              hint="Sub-blok atau rentang nomor rumah yang berada di jalan ini. Dipakai untuk mengisi jalan otomatis saat impor warga dan pendaftaran." />
            <Select label="Blok" value={ubah.blok} onChange={(e) => setUbah((s) => ({ ...s, blok: e.target.value }))}
              options={[{ value: '', label: 'Lintas blok' }, ...blok.map((b) => ({ value: b.kode, label: b.nama }))]}
              hint="Pilih Lintas blok bila jalan ini melewati beberapa blok." />
          </div>
        )}
      </Modal>
    </div>
  );
}
