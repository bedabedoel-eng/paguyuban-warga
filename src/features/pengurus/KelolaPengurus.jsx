import { useMemo } from 'react';
import HalamanData from '../../components/data/HalamanData';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { konfigPengurus } from './config/pengurus';

/** Menu Atur pengurus. Isinya ada di config/pengurus.jsx; form di FormJabatan.jsx. */
export default function KelolaPengurus() {
  const { hak, user } = useAuth();
  const { namaGang, alamatPendek } = useSettings();
  const konfig = useMemo(() => konfigPengurus({ hak, user, namaGang, alamatPendek }), [hak, user, namaGang, alamatPendek]);
  return <HalamanData konfig={konfig} />;
}
