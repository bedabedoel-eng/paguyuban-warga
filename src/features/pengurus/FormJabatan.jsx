import { useMemo, useState } from 'react';
import { Crown, Handshake, NotebookPen, Wallet, Signpost, Users } from 'lucide-react';
import { Button, Modal, Input, Select, Checkbox, Callout } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { simpanPengurus, daftarPengurus } from '../../services/pengurus';
import { daftarWarga } from '../../services/warga';
import { PERAN_PENGURUS } from '../../lib/akses';
import PilihWarga from './PilihWarga';

const IKON_PERAN = { ketua: Crown, wakil_ketua: Handshake, sekretaris: NotebookPen, bendahara: Wallet, humas: Signpost, seksi: Users };

export const PERAN_BLOK = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara'];
export const URUT = { ketua: 1, wakil_ketua: 2, sekretaris: 3, bendahara: 4, humas: 10, seksi: 20 };

/**
 * Form tetapkan/ubah jabatan pengurus. Isiannya saling bergantung sehingga tidak dibuat dari konfigurasi.
 * Warga dipilih lewat PilihWarga (cari + saring blok/jalan + daftar berfoto); peran dipilih lewat kartu.
 */
export default function FormJabatan({ baris: awal, onClose, onSaved }) {
  const { gang, blok, namaGang } = useSettings();
  const w = useAsync(() => daftarWarga({ limit: 2000 }), []);
  const warga = w.data;
  // Jabatan aktif yang sudah dipegang tiap warga (ditampilkan di daftar pilihan)
  const pj = useAsync(() => daftarPengurus(), []);
  const jabatan = useMemo(() => {
    const m = {};
    for (const p of pj.data || []) if (p.id !== awal?.id) (m[p.warga_id] ||= []).push(p.jabatan);
    return m;
  }, [pj.data, awal?.id]);
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
        <PilihWarga warga={warga} jabatan={jabatan} value={f.warga_id} error={err.warga_id} terkunci={!!awal}
          onChange={(id) => { setF((s) => ({ ...s, warga_id: id })); setErr((e) => ({ ...e, warga_id: undefined })); }} />
        {f.warga_id && jabatan[f.warga_id]?.length > 0 && (
          <Callout tone="info">Warga ini sudah memegang jabatan {jabatan[f.warga_id].join(', ')}. Jabatan baru ditambahkan, yang lama tetap berlaku.</Callout>
        )}
        <div className="stack-sm">
          <span className="pw-label">Peran</span>
          <div className="peran-grid" role="radiogroup" aria-label="Peran pengurus">
            {Object.entries(PERAN_PENGURUS).map(([value, p]) => {
              const Ikon = IKON_PERAN[value] || Users;
              return (
                <button key={value} type="button" role="radio" aria-checked={f.peran === value} className={`peran-tile${f.peran === value ? ' on' : ''}`} onClick={() => gantiPeran(value)}>
                  <span className="ico"><Ikon size={18} aria-hidden="true" /></span>
                  <span className="nm">{p.label}</span>
                  <span className="ds">{p.ringkas}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-grid">
          {f.peran === 'humas'
            ? <Select label="Jalan yang dipegang" value={f.wilayah_gang} error={err.wilayah_gang} placeholder="Pilih"
                onChange={(e) => setF((s) => ({ ...s, wilayah_gang: e.target.value, jabatan: jabatanOtomatis(s.jabatan) ? usulJabatan('humas', e.target.value) : s.jabatan }))}
                options={gang.map((g) => ({ value: g.id, label: g.blok ? `${g.nama} (Blok ${g.blok})` : g.nama }))} />
            : null}
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
