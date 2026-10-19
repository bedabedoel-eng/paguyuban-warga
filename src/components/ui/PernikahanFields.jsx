import { Input, Select } from './Field';
import { STATUS_PERNIKAHAN, pernahMenikah } from '../../lib/constants';

/** Status pernikahan; jumlah anak muncul bila sudah/pernah menikah (data sensus). */
export default function PernikahanFields({ status, anak, onStatus, onAnak, errors = {}, disabled }) {
  return (
    <>
      <Select label="Status pernikahan" optional value={status} onChange={(e) => onStatus(e.target.value)} placeholder="Belum diisi" disabled={disabled}
        options={Object.entries(STATUS_PERNIKAHAN).map(([value, v]) => ({ value, label: v.label }))} />
      {pernahMenikah(status) && (
        <Input label="Jumlah anak" type="number" inputMode="numeric" min="0" max="30" step="1" value={anak} disabled={disabled}
          onChange={(e) => onAnak(e.target.value)} error={errors.anak} hint={errors.anak ? undefined : 'Isi 0 bila belum memiliki anak'} />
      )}
    </>
  );
}

/** Validasi jumlah anak; mengembalikan pesan galat atau ''. */
export function galatAnak(status, anak) {
  if (!pernahMenikah(status) || anak === '' || anak == null) return '';
  const n = Number(anak);
  return Number.isInteger(n) && n >= 0 && n <= 30 ? '' : 'Jumlah anak: angka 0 sampai 30';
}

/** Kolom database dari isian: jumlah anak hanya disimpan bila sudah/pernah menikah. */
export const kolomPernikahan = (status, anak) => ({
  status_pernikahan: status || null,
  jumlah_anak: pernahMenikah(status) && anak !== '' && anak != null ? Number(anak) : null,
});
