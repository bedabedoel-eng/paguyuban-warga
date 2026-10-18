import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ambilPengaturan, daftarBlok } from '../services/pengaturan';
import { isConfigured } from '../lib/supabase';

const DEFAULT = {
  nama_paguyuban: 'Paguyuban Warga Digital',
  tagline: 'Bersama Membangun Lingkungan yang Lebih Baik',
  nama_lingkungan: '', rt: '', rw: '', alamat: '', luas_wilayah: '', tarif_ipl: 0,
  bank_nama: '', bank_norek: '', bank_atas_nama: '', jatuh_tempo_hari: 10,
};

const Ctx = createContext({ pengaturan: DEFAULT, blok: [], reload: () => {} });

export function SettingsProvider({ children }) {
  const [pengaturan, setPengaturan] = useState(DEFAULT);
  const [blok, setBlok] = useState([]);
  const reload = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const [p, b] = await Promise.all([ambilPengaturan(), daftarBlok()]);
      if (p) setPengaturan({ ...DEFAULT, ...p });
      setBlok(b || []);
    } catch { /* tetap pakai bawaan */ }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { document.title = pengaturan.nama_paguyuban; }, [pengaturan.nama_paguyuban]);
  return <Ctx.Provider value={{ pengaturan, blok, reload }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
