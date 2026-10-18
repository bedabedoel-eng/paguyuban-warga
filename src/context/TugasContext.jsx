import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { statistik } from '../services/dashboard';
import { useAuth } from './AuthContext';

const Ctx = createContext({ stat: null, total: 0, refresh: () => {} });

/** Angka pekerjaan yang menunggu pengurus (untuk lencana menu & beranda). */
export function TugasProvider({ children }) {
  const { hak } = useAuth();
  const [stat, setStat] = useState(null);
  const refresh = useCallback(async () => {
    if (!hak.aktif) return;
    try { setStat(await statistik()); } catch { /* abaikan */ }
  }, [hak.aktif]);
  useEffect(() => {
    refresh();
    if (!hak.pengurus) return undefined;
    const t = setInterval(refresh, 180000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [refresh, hak.pengurus]);
  const s = stat || {};
  const total = (hak.pengurus ? (s.anggota_menunggu || 0) + (s.laporan_baru || 0) : 0)
    + (hak.bendahara ? s.pembayaran_menunggu || 0 : 0)
    + (hak.setujui_kas ? s.pengeluaran_menunggu || 0 : 0);
  return <Ctx.Provider value={{ stat, total, refresh }}>{children}</Ctx.Provider>;
}

export const useTugas = () => useContext(Ctx);
