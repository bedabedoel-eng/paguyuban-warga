import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, ImagePicker, Input, SegTabs, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { simpanPengaturan, simpanBlok, hapusBlok, daftarKontakDarurat, simpanKontakDarurat, hapusKontakDarurat } from '../../services/pengaturan';
import { uploadFile, removeFile, publicUrl } from '../../lib/storage';

function Umum() {
  const { pengaturan, reload } = useSettings();
  const toast = useToast();
  const [f, setF] = useState({ ...pengaturan });
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function simpan(e) {
    e.preventDefault();
    if (f.nama_paguyuban.trim().length < 3) return toast.error('Nama paguyuban minimal 3 huruf');
    setLoading(true);
    try {
      let foto_lingkungan = f.foto_lingkungan || null;
      if (foto) { foto_lingkungan = await uploadFile('publik', 'lingkungan', foto, { maxSize: 1600 }); if (pengaturan.foto_lingkungan) removeFile('publik', pengaturan.foto_lingkungan).catch(() => {}); }
      await simpanPengaturan({
        nama_paguyuban: f.nama_paguyuban.trim(), tagline: f.tagline.trim(), nama_lingkungan: f.nama_lingkungan.trim(), rt: f.rt.trim(), rw: f.rw.trim(),
        alamat: f.alamat.trim(), luas_wilayah: f.luas_wilayah.trim(), latitude: f.latitude === '' || f.latitude == null ? null : Number(f.latitude), longitude: f.longitude === '' || f.longitude == null ? null : Number(f.longitude),
        tarif_ipl: Math.max(0, Math.round(Number(f.tarif_ipl) || 0)), jatuh_tempo_hari: Math.min(28, Math.max(1, Number(f.jatuh_tempo_hari) || 10)),
        bank_nama: f.bank_nama.trim(), bank_norek: f.bank_norek.trim(), bank_atas_nama: f.bank_atas_nama.trim(), foto_lingkungan,
      });
      await reload(); setFoto(null); toast.success('Pengaturan disimpan');
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }
  return (
    <form className="stack" onSubmit={simpan} noValidate>
      <Card pad className="stack">
        <h2>Profil Paguyuban</h2>
        <Input label="Nama paguyuban" value={f.nama_paguyuban} onChange={set('nama_paguyuban')} maxLength={80} />
        <Input label="Tagline" value={f.tagline} onChange={set('tagline')} maxLength={120} />
        <Input label="Nama lingkungan / perumahan" value={f.nama_lingkungan} onChange={set('nama_lingkungan')} maxLength={80} />
        <div className="form-grid"><Input label="RT" value={f.rt} onChange={set('rt')} maxLength={5} /><Input label="RW" value={f.rw} onChange={set('rw')} maxLength={5} /></div>
        <Input label="Alamat" value={f.alamat} onChange={set('alamat')} maxLength={200} />
        <Input label="Luas wilayah" value={f.luas_wilayah} onChange={set('luas_wilayah')} maxLength={20} placeholder="2,5 Ha" />
        <div className="form-grid"><Input label="Latitude (cuaca)" type="number" step="any" value={f.latitude ?? ''} onChange={set('latitude')} /><Input label="Longitude (cuaca)" type="number" step="any" value={f.longitude ?? ''} onChange={set('longitude')} /></div>
        <div className="field"><span className="label">Foto lingkungan (banner dashboard)</span><ImagePicker file={foto} onChange={setFoto} previewUrl={pengaturan.foto_lingkungan ? publicUrl(pengaturan.foto_lingkungan) : null} /></div>
      </Card>
      <Card pad className="stack">
        <h2>Iuran IPL & Rekening</h2>
        <div className="form-grid"><Input label="Tarif IPL per bulan (Rp)" type="number" min="0" value={f.tarif_ipl} onChange={set('tarif_ipl')} /><Input label="Jatuh tempo (tanggal)" type="number" min="1" max="28" value={f.jatuh_tempo_hari} onChange={set('jatuh_tempo_hari')} /></div>
        <div className="form-grid"><Input label="Nama bank" value={f.bank_nama} onChange={set('bank_nama')} maxLength={40} /><Input label="Nomor rekening" value={f.bank_norek} onChange={set('bank_norek')} maxLength={40} /></div>
        <Input label="Atas nama" value={f.bank_atas_nama} onChange={set('bank_atas_nama')} maxLength={80} />
      </Card>
      <div><Button type="submit" loading={loading}>Simpan Pengaturan</Button></div>
    </form>
  );
}

function Blok() {
  const { blok, reload } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const [kode, setKode] = useState(''); const [nama, setNama] = useState('');
  async function tambah() {
    const k = kode.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,5}$/.test(k)) return toast.error('Kode blok 1-5 huruf/angka');
    try { await simpanBlok({ kode: k, nama: nama.trim() || `Blok ${k}`, urutan: blok.length + 1 }); setKode(''); setNama(''); reload(); toast.success('Blok ditambahkan'); } catch (e) { toast.error(e); }
  }
  async function hapus(b) {
    if (!(await confirm({ title: `Hapus ${b.nama}?`, text: 'Blok yang masih dipakai rumah tidak dapat dihapus.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusBlok(b.kode); reload(); toast.success('Blok dihapus'); } catch (e) { toast.error('Blok masih dipakai oleh rumah atau warga'); }
  }
  return (
    <Card pad className="stack">
      <h2>Daftar Blok</h2>
      <div className="list">{blok.map((b) => <div className="list-item" key={b.kode}><span className="grow"><b>{b.kode}</b> <span className="muted">{b.nama}</span></span><button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => hapus(b)} aria-label={`Hapus ${b.nama}`}><Trash2 size={17} /></button></div>)}</div>
      <div className="form-grid"><Input placeholder="Kode (A)" value={kode} onChange={(e) => setKode(e.target.value)} maxLength={5} /><Input placeholder="Nama (Blok A)" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={40} /></div>
      <div><Button icon={Plus} variant="outline" onClick={tambah}>Tambah Blok</Button></div>
    </Card>
  );
}

function Darurat() {
  const toast = useToast();
  const s = useAsync(daftarKontakDarurat, []);
  const [nama, setNama] = useState(''); const [nomor, setNomor] = useState(''); const [ket, setKet] = useState('');
  async function tambah() {
    if (nama.trim().length < 2) return toast.error('Isi nama kontak');
    if (!/^[0-9+ -]{3,20}$/.test(nomor)) return toast.error('Nomor tidak valid');
    try { await simpanKontakDarurat({ nama: nama.trim(), nomor: nomor.trim(), keterangan: ket.trim() || null, urutan: (s.data?.length || 0) + 1 }); setNama(''); setNomor(''); setKet(''); s.reload(); } catch (e) { toast.error(e); }
  }
  return (
    <Card pad className="stack">
      <h2>Kontak Darurat</h2>
      <div className="list">{s.data?.map((k) => <div className="list-item" key={k.id}><span className="grow"><b>{k.nama}</b> <span className="muted">{k.nomor}</span></span><button className="icon-btn" style={{ color: 'var(--red)' }} onClick={async () => { try { await hapusKontakDarurat(k.id); s.reload(); } catch (e) { toast.error(e); } }} aria-label={`Hapus ${k.nama}`}><Trash2 size={17} /></button></div>)}</div>
      <div className="form-grid"><Input placeholder="Nama (Pos Satpam)" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={60} /><Input placeholder="Nomor" value={nomor} onChange={(e) => setNomor(e.target.value)} maxLength={20} /><Input fieldClass="span-2" placeholder="Keterangan (opsional)" value={ket} onChange={(e) => setKet(e.target.value)} maxLength={120} /></div>
      <div><Button icon={Plus} variant="outline" onClick={tambah}>Tambah Kontak</Button></div>
    </Card>
  );
}

export default function PengaturanPaguyuban() {
  const [tab, setTab] = useState('umum');
  return (
    <>
      <PageHeader title="Pengaturan Paguyuban" />
      <div className="page form">
        <div className="page-inner">
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: 'umum', label: 'Umum' }, { value: 'blok', label: 'Blok' }, { value: 'darurat', label: 'Darurat' }]} />
          {tab === 'umum' ? <Umum /> : tab === 'blok' ? <Blok /> : <Darurat />}
        </div>
      </div>
    </>
  );
}
