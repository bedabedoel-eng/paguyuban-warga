import { useMemo } from 'react';
import HalamanData from '../../components/data/HalamanData';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { konfigWarga } from './config/warga';

/** Menu Data anggota. Seluruh isinya ada di config/warga.jsx; form lengkap di EditWarga.jsx. */
export default function DataWarga({ tertanam = false }) {
  const { hak, user } = useAuth();
  const { blok, gang, namaGang } = useSettings();
  const konfig = useMemo(() => konfigWarga({ hak, user, blok, gang, namaGang }), [hak, user, blok, gang, namaGang]);
  return <HalamanData konfig={konfig} tertanam={tertanam} />;
}
