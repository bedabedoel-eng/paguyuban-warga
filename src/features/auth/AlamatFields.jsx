import { Select, NomorRumahFields } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { gangDiBlok } from '../../lib/alamat';

/** Isian alamat: blok -> sub-blok + nomor rumah -> jalan (bila blok punya gang). */
export default function AlamatFields({ f, setF, errors = {} }) {
  const { blok, gang } = useSettings();
  const opsiGang = f.blok ? gangDiBlok(gang, f.blok) : [];
  const gantiBlok = (e) => {
    const b = e.target.value;
    setF((s) => ({ ...s, blok: b, gang: gangDiBlok(gang, b).some((g) => g.id === s.gang) ? s.gang : '' }));
  };
  return (
    <>
      <div className="form-grid">
        <Select label="Blok" placeholder="Pilih" value={f.blok} onChange={gantiBlok} error={errors.blok}
          options={blok.map((b) => ({ value: b.kode, label: b.nama }))} />
      </div>
      <div className="form-grid">
        <NomorRumahFields value={f.noRumah} onChange={(v) => setF((s) => ({ ...s, noRumah: v }))} error={errors.noRumah} />
      </div>
      {opsiGang.length > 0 && (
        <Select label="Jalan" placeholder="Pilih nama jalan" value={f.gang || ''} error={errors.gang}
          onChange={(e) => setF((s) => ({ ...s, gang: e.target.value }))}
          options={opsiGang.map((g) => ({ value: g.id, label: g.nama }))}
          hint={errors.gang ? undefined : 'Pendaftaran Anda diperiksa humas jalan ini.'} />
      )}
    </>
  );
}
