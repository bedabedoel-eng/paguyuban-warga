import { useMemo } from 'react';
import HalamanData from '../../components/data/HalamanData';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { konfigRumah } from './config/rumah';

/** Menu Data rumah. Seluruh isinya ada di config/rumah.js; halaman ini hanya merangkai. */
export default function DataRumah() {
  const { hak } = useAuth();
  const { blok, pengaturan } = useSettings();
  const konfig = useMemo(() => konfigRumah({ blok, pengaturan, hak }), [blok, pengaturan, hak]);
  return <HalamanData konfig={konfig} />;
}
