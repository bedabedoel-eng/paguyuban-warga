import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ambilPengaturan, daftarBlok, daftarGang } from '../services/pengaturan';
import { alamatLengkap, alamatRingkas, cariGang } from '../lib/alamat';
import { isConfigured } from '../lib/supabase';

const DEFAULT = {
  nama_paguyuban: 'Paguyuban Warga Digital',
  tagline: 'Bersama Membangun Lingkungan yang Lebih Baik',
  nama_lingkungan: 'Perumahan Vila Gading Royal', rt: '', rw: '', alamat: 'Desa Pamegarsari, Kec. Parung, Kab. Bogor', luas_wilayah: '', tarif_ipl: 0,
  bank_nama: '', bank_norek: '', bank_atas_nama: '', jatuh_tempo_hari: 10,
};

const Ctx = createContext({ pengaturan: DEFAULT, blok: [], gang: [], reload: () => {}, alamat: () => '', alamatPendek: () => '', namaGang: () => null });

export function SettingsProvider({ children }) {
  const [pengaturan, setPengaturan] = useState(DEFAULT);
  const [blok, setBlok] = useState([]);
  const [gang, setGang] = useState([]);
  const reload = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const [p, b, g] = await Promise.all([ambilPengaturan(), daftarBlok(), daftarGang()]);
      if (p) setPengaturan({ ...DEFAULT, ...p });
      setBlok(b || []);
      setGang(g || []);
    } catch { /* tetap pakai bawaan */ }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { document.title = pengaturan.nama_paguyuban; }, [pengaturan.nama_paguyuban]);
  const value = useMemo(() => ({
    pengaturan, blok, gang, reload,
    alamat: (w) => alamatLengkap(w, gang),
    alamatPendek: (w) => alamatRingkas(w, gang),
    namaGang: (id) => cariGang(gang, id)?.nama || null,
  }), [pengaturan, blok, gang, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
