import { Field, ChoiceGroup, Select } from './Field';
import { Globe2, LayoutGrid, Signpost } from 'lucide-react';
import { opsiSasaran } from '../../lib/akses';

const JUDUL = {
  semua: 'Semua warga',
  blok: 'Blok tertentu',
  jalan: 'Jalan tertentu',
};
const IKON = { semua: Globe2, blok: LayoutGrid, jalan: Signpost };
const BANTUAN = {
  semua: 'Seluruh warga aktif menerima notifikasi.',
  blok: 'Hanya warga di blok yang dipilih yang melihat dan menerima notifikasi.',
  jalan: 'Hanya warga di jalan yang dipilih yang melihat dan menerima notifikasi.',
};

/**
 * Sasaran pengumuman/kegiatan: semua warga, satu blok, atau satu jalan.
 * value: '' (semua) | 'b:<kode blok>' | 'g:<id jalan>'
 */
export default function SasaranField({ value, onChange, hak, blok, gang, disabled, label = 'Ditujukan untuk' }) {
  const opsi = opsiSasaran(hak, blok, gang);
  const tipeAda = ['semua', 'blok', 'jalan'].filter((t) => opsi.some((o) => o.tipe === t));
  const tipeNilai = value?.startsWith('g:') ? 'jalan' : value?.startsWith('b:') ? 'blok' : 'semua';
  const tipe = tipeAda.includes(tipeNilai) ? tipeNilai : tipeAda[0];
  const daftar = opsi.filter((o) => o.tipe === tipe);
  const ganti = (t) => onChange(opsi.find((o) => o.tipe === t)?.value ?? '');
  if (!tipeAda.length) return <Field label={label}><span className="text-sm muted">Anda belum memegang blok atau jalan. Hubungi ketua.</span></Field>;
  return (
    <div className="stack-sm">
      <Field label={label}>
        {tipeAda.length > 1
          ? <ChoiceGroup label={label} value={tipe} onChange={disabled ? () => {} : ganti} options={tipeAda.map((t) => ({ value: t, label: JUDUL[t], icon: IKON[t] }))} />
          : <span className="strong">{JUDUL[tipe]}</span>}
      </Field>
      {tipe !== 'semua' && (
        <Select label={tipe === 'blok' ? 'Pilih blok' : 'Pilih jalan'} value={daftar.some((o) => o.value === value) ? value : ''} placeholder="Pilih"
          onChange={(e) => onChange(e.target.value)} options={daftar} disabled={disabled} />
      )}
      <p className="text-xs muted">{BANTUAN[tipe]}</p>
    </div>
  );
}
