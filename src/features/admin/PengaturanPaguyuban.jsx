import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Save } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button, Card, CardHead, CardBody, ImagePicker, Input, LineTabs, IconButton, Field, useConfirm } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { simpanPengaturan, simpanBlok, hapusBlok, daftarKontakDarurat, simpanKontakDarurat, hapusKontakDarurat } from '../../services/pengaturan';
import { uploadFile, removeFile, publicUrl } from '../../lib/storage';
import { rupiah } from '../../lib/format';

function Umum() {
  const { pengaturan, reload } = useSettings();
  const toast = useToast();
  const [f, setF] = useState({ batas_persetujuan: 1000000, ...pengaturan });
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
      const data = {
        nama_paguyuban: f.nama_paguyuban.trim(), tagline: f.tagline.trim(), nama_lingkungan: f.nama_lingkungan.trim(), rt: f.rt.trim(), rw: f.rw.trim(),
        alamat: f.alamat.trim(), luas_wilayah: f.luas_wilayah.trim(), latitude: f.latitude === '' || f.latitude == null ? null : Number(f.latitude), longitude: f.longitude === '' || f.longitude == null ? null : Number(f.longitude),
        tarif_ipl: Math.max(0, Math.round(Number(f.tarif_ipl) || 0)), jatuh_tempo_hari: Math.min(28, Math.max(1, Number(f.jatuh_tempo_hari) || 10)),
        bank_nama: f.bank_nama.trim(), bank_norek: f.bank_norek.trim(), bank_atas_nama: f.bank_atas_nama.trim(), foto_lingkungan,
      };
      if ('batas_persetujuan' in pengaturan) data.batas_persetujuan = Math.max(0, Math.round(Number(f.batas_persetujuan) || 0));
      await simpanPengaturan(data);
      await reload(); setFoto(null); toast.success('Pengaturan disimpan');
    } catch (e2) { toast.error(e2); } finally { setLoading(false); }
  }
  return (
    <form className="stack" onSubmit={simpan} noValidate>
      <Card>
        <CardHead title="Profil paguyuban" desc="Tampil di halaman masuk, sidebar, dan beranda." />
        <CardBody className="form-grid">
          <Input fieldClass="span-2" label="Nama paguyuban" value={f.nama_paguyuban} onChange={set('nama_paguyuban')} maxLength={80} />
          <Input fieldClass="span-2" label="Tagline" value={f.tagline} onChange={set('tagline')} maxLength={120} />
          <Input fieldClass="span-2" label="Nama lingkungan / perumahan" value={f.nama_lingkungan} onChange={set('nama_lingkungan')} maxLength={80} />
          <Input label="RT" value={f.rt} onChange={set('rt')} maxLength={5} />
          <Input label="RW" value={f.rw} onChange={set('rw')} maxLength={5} />
          <Input fieldClass="span-2" label="Alamat" value={f.alamat} onChange={set('alamat')} maxLength={200} />
          <Input label="Luas wilayah" optional value={f.luas_wilayah} onChange={set('luas_wilayah')} maxLength={20} placeholder="2,5 Ha" />
          <span />
          <Input label="Latitude" optional type="number" step="any" value={f.latitude ?? ''} onChange={set('latitude')} hint="Untuk cuaca di beranda" />
          <Input label="Longitude" optional type="number" step="any" value={f.longitude ?? ''} onChange={set('longitude')} />
          <Field label="Foto lingkungan" optional className="span-2"><ImagePicker file={foto} onChange={setFoto} previewUrl={pengaturan.foto_lingkungan ? publicUrl(pengaturan.foto_lingkungan) : null} /></Field>
        </CardBody>
      </Card>
      <Card>
        <CardHead title="Iuran & keuangan" />
        <CardBody className="form-grid">
          <Input label="Tarif IPL per bulan (Rp)" type="number" min="0" value={f.tarif_ipl} onChange={set('tarif_ipl')} />
          <Input label="Jatuh tempo (tanggal)" type="number" min="1" max="28" value={f.jatuh_tempo_hari} onChange={set('jatuh_tempo_hari')} />
          {'batas_persetujuan' in pengaturan && (
            <Input fieldClass="span-2" label="Batas persetujuan Ketua (Rp)" type="number" min="0" value={f.batas_persetujuan} onChange={set('batas_persetujuan')}
              hint={Number(f.batas_persetujuan) > 0 ? `Pengeluaran mulai ${rupiah(f.batas_persetujuan)} yang dicatat bendahara menunggu persetujuan Ketua sebelum mengurangi saldo.` : 'Isi 0 untuk menonaktifkan persetujuan.'} />
          )}
          <Input label="Nama bank" value={f.bank_nama} onChange={set('bank_nama')} maxLength={40} />
          <Input label="Nomor rekening" value={f.bank_norek} onChange={set('bank_norek')} maxLength={40} />
          <Input fieldClass="span-2" label="Atas nama" value={f.bank_atas_nama} onChange={set('bank_atas_nama')} maxLength={80} />
        </CardBody>
      </Card>
      <div className="form-actions"><Button type="submit" icon={Save} loading={loading}>Simpan pengaturan</Button></div>
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
    if (!/^[A-Z0-9]{1,5}$/.test(k)) return toast.error('Kode 1–5 huruf/angka, contoh A atau C');
    try { await simpanBlok({ kode: k, nama: nama.trim() || `Blok ${k}`, urutan: blok.length + 1 }); setKode(''); setNama(''); reload(); toast.success('Blok ditambahkan'); } catch (e) { toast.error(e); }
  }
  async function hapus(b) {
    if (!(await confirm({ title: `Hapus ${b.nama}?`, text: 'Blok yang masih dipakai rumah atau warga tidak dapat dihapus.', okLabel: 'Hapus', danger: true }))) return;
    try { await hapusBlok(b.kode); reload(); toast.success('Blok dihapus'); } catch { toast.error('Blok masih dipakai oleh rumah atau warga'); }
  }
  return (
    <Card>
      <CardHead title="Blok" desc="Satu blok dapat berisi beberapa nama jalan." action={<Link className="link text-sm" to="/admin/wilayah">Atur jalan</Link>} />
      <div className="rows inset">
        {blok.map((b) => (
          <div className="rowi" key={b.kode}>
            <span className="ico sm neutral strong">{b.kode}</span>
            <span className="rowi-main"><span className="rowi-title">{b.nama}</span></span>
            <IconButton small danger icon={Trash2} size={16} label={`Hapus ${b.nama}`} onClick={() => hapus(b)} />
          </div>
        ))}
      </div>
      <div className="card-foot">
        <div className="row wrap row-top">
          <Input fieldClass="grow" placeholder="Kode (C)" value={kode} onChange={(e) => setKode(e.target.value)} maxLength={5} aria-label="Kode blok" style={{ maxWidth: 120 }} />
          <Input fieldClass="grow" placeholder="Nama (Blok C)" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={40} aria-label="Nama blok" />
          <Button icon={Plus} variant="secondary" onClick={tambah}>Tambah</Button>
        </div>
      </div>
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
    try { await simpanKontakDarurat({ nama: nama.trim(), nomor: nomor.trim(), keterangan: ket.trim() || null, urutan: (s.data?.length || 0) + 1 }); setNama(''); setNomor(''); setKet(''); s.reload(); toast.success('Kontak ditambahkan'); } catch (e) { toast.error(e); }
  }
  return (
    <Card>
      <CardHead title="Kontak darurat" desc="Ditampilkan di beranda dan menu warga." />
      <div className="rows inset">
        {s.data?.map((k) => (
          <div className="rowi" key={k.id}>
            <span className="rowi-main"><span className="rowi-title">{k.nama}</span><span className="rowi-sub num">{k.nomor}{k.keterangan ? ` · ${k.keterangan}` : ''}</span></span>
            <IconButton small danger icon={Trash2} size={16} label={`Hapus ${k.nama}`} onClick={async () => { try { await hapusKontakDarurat(k.id); s.reload(); } catch (e) { toast.error(e); } }} />
          </div>
        ))}
      </div>
      <div className="card-foot form-grid">
        <Input placeholder="Nama (Pos Satpam)" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={60} aria-label="Nama kontak" />
        <Input placeholder="Nomor" value={nomor} onChange={(e) => setNomor(e.target.value)} maxLength={20} aria-label="Nomor" />
        <Input fieldClass="span-2" placeholder="Keterangan (opsional)" value={ket} onChange={(e) => setKet(e.target.value)} maxLength={120} aria-label="Keterangan" />
        <div><Button icon={Plus} variant="secondary" onClick={tambah}>Tambah kontak</Button></div>
      </div>
    </Card>
  );
}

export default function PengaturanPaguyuban() {
  const [tab, setTab] = useState('umum');
  return (
    <div className="page form">
      <PageHeader back title="Pengaturan paguyuban" desc="Hanya admin. Perubahan berlaku untuk seluruh warga." />
      <LineTabs value={tab} onChange={setTab} tabs={[{ value: 'umum', label: 'Umum & iuran' }, { value: 'blok', label: 'Blok & jalan' }, { value: 'darurat', label: 'Kontak darurat' }]} />
      {tab === 'umum' ? <Umum /> : tab === 'blok' ? <Blok /> : <Darurat />}
    </div>
  );
}
