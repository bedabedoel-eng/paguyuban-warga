import { Input } from './Field';
import { pecahNomor, gabungNomor } from '../../lib/alamat';

/**
 * Isian nomor rumah terpisah: Sub-blok + Nomor. Nilai gabungan tetap disimpan sebagai "sub/nomor" (mis. 3/5)
 * pada satu kolom no_rumah, sehingga data lama dan seluruh fitur lain tidak berubah.
 */
export default function NomorRumahFields({ value, onChange, error, disabled, subOpsional = true }) {
  const { sub, nomor } = pecahNomor(value);
  return (
    <>
      <Input label="Sub-blok" optional={subOpsional} value={sub} disabled={disabled} maxLength={4} placeholder="Contoh: 3"
        onChange={(e) => onChange(gabungNomor(e.target.value.replace(/[^0-9A-Za-z]/g, ''), nomor))} hint="Bagian sebelum nomor, mis. A3 → isi 3" />
      <Input label="No. rumah" value={nomor} disabled={disabled} maxLength={5} placeholder="Contoh: 5" error={error}
        onChange={(e) => onChange(gabungNomor(sub, e.target.value.replace(/[^0-9A-Za-z-]/g, '')))} />
    </>
  );
}
