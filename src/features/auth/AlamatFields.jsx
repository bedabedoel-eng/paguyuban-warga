import { Input, Select } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import { gangDiBlok } from '../../lib/alamat';

/** Isian alamat: blok -> gang/jalan (bila blok punya gang) -> nomor rumah. */
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
        <Input label="Nomor rumah" value={f.noRumah} onChange={(e) => setF((s) => ({ ...s, noRumah: e.target.value }))}
          error={errors.noRumah} maxLength={10} placeholder="Contoh: 3/5" hint={errors.noRumah ? undefined : 'Sesuai alamat, mis. 12 atau 3/5'} />
      </div>
      {opsiGang.length > 0 && (
        <Select label="Gang / jalan" placeholder="Pilih gang atau nama jalan" value={f.gang || ''} error={errors.gang}
          onChange={(e) => setF((s) => ({ ...s, gang: e.target.value }))}
          options={opsiGang.map((g) => ({ value: g.id, label: g.nama }))}
          hint={errors.gang ? undefined : 'Pendaftaran Anda diperiksa humas gang ini.'} />
      )}
    </>
  );
}
