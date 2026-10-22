import { useMemo, useState } from 'react';
import { Button, Callout, Input, Modal, Select } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { KOLOM_MASSAL, patchMassal } from '../../lib/perbaikanWarga';
import { STATUS_HUNIAN, STATUS_PERNIKAHAN } from '../../lib/constants';
import { pesanError } from '../../lib/errors';
import { perbaruiWargaMassal } from '../../services/warga';

const KOSONGKAN = '__kosong';

/**
 * Ubah satu kolom untuk banyak warga terpilih sekaligus (mis. semua hasil filter "Rumah ditempati: belum diisi"
 * diisi "Milik sendiri"). Memakai fungsi server yang sama dengan Import CSV, jadi aturan dan kewenangannya sama.
 */
export default function UbahMassal({ daftar, onClose, onSelesai }) {
  const { gang, blok } = useSettings();
  const toast = useToast();
  const [kolom, setKolom] = useState('status_hunian');
  const [nilai, setNilai] = useState('');
  const [loading, setLoading] = useState(false);

  const blokTerpilih = useMemo(() => [...new Set(daftar.map((w) => w.blok).filter(Boolean))], [daftar]);
  const opsiJalan = useMemo(() => gang
    .filter((g) => !g.blok || blokTerpilih.includes(g.blok))
    .map((g) => ({ value: g.id, label: g.blok ? `${g.nama} (${blok.find((b) => b.kode === g.blok)?.nama || `Blok ${g.blok}`})` : g.nama })), [gang, blok, blokTerpilih]);
  const opsi = {
    gang: opsiJalan,
    status_hunian: Object.entries(STATUS_HUNIAN).map(([value, v]) => ({ value, label: v.label })),
    status_pernikahan: Object.entries(STATUS_PERNIKAHAN).map(([value, v]) => ({ value, label: v.label })),
    kepala_keluarga: [{ value: 'ya', label: 'Ya, kepala keluarga' }, { value: 'tidak', label: 'Bukan kepala keluarga' }],
  }[kolom];
  const bolehKosong = kolom !== 'kepala_keluarga';

  const isi = nilai === KOSONGKAN ? '' : nilai;
  const siap = kolom === 'pekerjaan' ? true : nilai !== '';
  const rencana = useMemo(() => (siap ? patchMassal(daftar, kolom, isi, { gang }) : null), [siap, daftar, kolom, isi, gang]);
  const gantiKolom = (e) => { setKolom(e.target.value); setNilai(''); };

  async function simpan() {
    if (!rencana?.patch.length) return;
    setLoading(true);
    try {
      const res = await perbaruiWargaMassal(rencana.patch);
      const gagal = res.dilewati || [];
      if (res.diubah) toast.success(`${res.diubah} warga diperbarui`);
      if (gagal.length) toast.error(`${gagal.length} warga tidak diperbarui. ${gagal[0].nama ? `${gagal[0].nama}: ` : ''}${gagal[0].alasan}`);
      onSelesai();
    } catch (e) { toast.error(pesanError(e)); } finally { setLoading(false); }
  }

  const label = KOLOM_MASSAL.find((k) => k.value === kolom)?.label.toLowerCase();
  return (
    <Modal open onClose={onClose} title={`Ubah ${daftar.length} warga sekaligus`} desc="Pilih kolom, lalu isi nilai barunya untuk semua warga terpilih."
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={loading} disabled={!rencana?.patch.length} onClick={simpan}>{rencana?.patch.length ? `Ubah ${rencana.patch.length} warga` : 'Ubah'}</Button></>}>
      <div className="stack">
        <div className="form-grid">
          <Select label="Kolom yang diubah" value={kolom} onChange={gantiKolom} options={KOLOM_MASSAL} />
          {kolom === 'pekerjaan'
            ? <Input label="Pekerjaan baru" value={nilai} onChange={(e) => setNilai(e.target.value)} maxLength={60} placeholder="Kosongkan untuk menghapus" />
            : <Select label={`Nilai ${label}`} value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="Pilih"
                options={[...(opsi || []), ...(bolehKosong ? [{ value: KOSONGKAN, label: 'Kosongkan' }] : [])]} />}
        </div>
        {kolom === 'gang' && blokTerpilih.length > 1 && <p className="text-xs muted">Warga terpilih ada di {blokTerpilih.length} blok. Jalan hanya diterapkan pada warga di blok jalan tersebut.</p>}
        {kolom === 'status_pernikahan' && isi === 'belum_menikah' && <p className="text-xs muted">Jumlah anak ikut dikosongkan untuk status belum menikah.</p>}
        {rencana && (
          <Callout tone={rencana.patch.length ? 'info' : 'warn'}>
            {rencana.patch.length ? <><b>{rencana.patch.length} warga</b> akan diubah.</> : 'Tidak ada warga yang perlu diubah.'}
            {rencana.sama.length > 0 && ` ${rencana.sama.length} sudah bernilai sama.`}
            {rencana.lewat.length > 0 && ` ${rencana.lewat.length} dilewati: ${rencana.lewat.slice(0, 3).map((x) => `${x.w.nama} (${x.alasan})`).join(', ')}${rencana.lewat.length > 3 ? ', …' : ''}.`}
          </Callout>
        )}
      </div>
    </Modal>
  );
}
