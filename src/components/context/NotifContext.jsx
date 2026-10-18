import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { jumlahBelumDibaca } from '../services/notifikasi';
import { useAuth } from './AuthContext';

const Ctx = createContext({ unread: 0, refresh: () => {} });

/** Jumlah notifikasi belum dibaca, diperbarui realtime + saat aplikasi kembali aktif. */
export function NotifProvider({ children }) {
  const { user, hak } = useAuth();
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    if (!user || !hak.aktif) { setUnread(0); return; }
    try { setUnread(await jumlahBelumDibaca()); } catch { /* abaikan */ }
  }, [user, hak.aktif]);

  useEffect(() => {
    refresh();
    if (!user || !hak.aktif) return undefined;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifikasi', filter: `warga_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const t = setInterval(refresh, 120000);
    return () => { supabase.removeChannel(ch); window.removeEventListener('focus', onFocus); clearInterval(t); };
  }, [user, hak.aktif, refresh]);

  return <Ctx.Provider value={{ unread, refresh }}>{children}</Ctx.Provider>;
}

export const useNotif = () => useContext(Ctx);
