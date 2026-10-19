import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { profilSaya, hakSaya } from '../services/warga';
import { keluar as signOutApi } from '../services/auth';
import { HAK_KOSONG, normalHak, labelPeran } from '../lib/akses';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [warga, setWarga] = useState(null);
  const [kontak, setKontak] = useState(null);
  const [jabatan, setJabatan] = useState([]);
  const [hak, setHak] = useState(HAK_KOSONG);
  const [loading, setLoading] = useState(isConfigured);
  const [profilError, setProfilError] = useState(null);
  const uidRef = useRef(null);

  const muatProfil = useCallback(async (uid) => {
    if (!uid) { setWarga(null); setKontak(null); setJabatan([]); setHak(HAK_KOSONG); return; }
    try {
      setProfilError(null);
      const [{ warga: w, kontak: k, jabatan: j }, h] = await Promise.all([profilSaya(uid), hakSaya()]);
      setWarga(w); setKontak(k); setJabatan(j || []); setHak(normalHak(h));
    } catch (e) {
      setProfilError(e);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) return undefined;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      uidRef.current = data.session?.user?.id || null;
      await muatProfil(uidRef.current);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const uid = s?.user?.id || null;
      const berganti = uid !== uidRef.current;
      if (berganti || event === 'USER_UPDATED') {
        uidRef.current = uid;
        // jangan await di dalam callback (hindari deadlock supabase-js)
        // Layar muat hanya saat pengguna berganti; pembaruan akun (mis. ganti PIN) memuat ulang profil diam-diam.
        setTimeout(async () => {
          if (berganti) setLoading(true);
          await muatProfil(uid);
          if (berganti) setLoading(false);
        }, 0);
      }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [muatProfil]);

  const signOut = useCallback(async () => {
    await signOutApi();
    setWarga(null); setKontak(null); setJabatan([]); setHak(HAK_KOSONG);
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    warga,
    kontak,
    jabatan,
    /** Label jabatan utama untuk tampilan */
    peranLabel: labelPeran(hak, jabatan[0]?.jabatan),
    hak,
    loading,
    profilError,
    setWarga,
    setKontak,
    refreshProfil: () => muatProfil(session?.user?.id),
    signOut,
  }), [session, warga, kontak, jabatan, hak, loading, profilError, muatProfil, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
