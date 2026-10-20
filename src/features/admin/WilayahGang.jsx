import { useMemo, useState } from 'react';
import { FileUp } from 'lucide-react';
import HalamanData from '../../components/data/HalamanData';
import { Button, IconButton } from '../../components/ui';
import { useSettings } from '../../context/SettingsContext';
import ImportWilayah from './ImportWilayah';
import { konfigWilayah, layananJalan } from './config/wilayah';

/** Menu Blok & jalan. Seluruh isinya ada di config/wilayah.js; impor CSV tetap di ImportWilayah.jsx. */
export default function WilayahGang() {
  const { blok, gang, reload } = useSettings();
  const [impor, setImpor] = useState(false);
  const [versi, setVersi] = useState(0); // naik setelah impor → daftar dimuat ulang
  const layanan = useMemo(() => layananJalan(reload), [reload, versi]); // eslint-disable-line react-hooks/exhaustive-deps
  const konfig = useMemo(() => ({
    ...konfigWilayah({ blok, gang, layanan, aksiHeader: <Button size="sm" variant="secondary" icon={FileUp} onClick={() => setImpor(true)}>Impor CSV</Button> }),
    aksiHeaderMobile: <IconButton icon={FileUp} label="Impor CSV" onClick={() => setImpor(true)} />,
    bawah: <ImportWilayah open={impor} onClose={() => { setImpor(false); setVersi((v) => v + 1); }} />,
  }), [blok, gang, layanan, impor]);
  return <HalamanData konfig={konfig} />;
}
