import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import HalamanData from '../../components/data/HalamanData';
import { Button, IconButton, SegTabs } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { STATUS_WARGA } from '../../lib/constants';
import { konfigWarga } from '../admin/config/warga';
import Direktori, { Kartu } from './Direktori';

const ImporWarga = lazy(() => import('./ImporWarga'));
const UbahMassal = lazy(() => import('./UbahMassal'));

const SIMPAN = 'warga_tampilan';
const bacaTampilan = () => { try { return localStorage.getItem(SIMPAN) === 'foto' ? 'foto' : 'tabel'; } catch { return 'tabel'; } };

/**
 * Menu "Warga".
 * - Warga biasa: Direktori (kenali tetangga).
 * - Pengelola (pimpinan, sekretaris, humas, admin): SATU halaman tanpa tab. Tabel semua warga dengan cari & filter,
 *   tampilan Tabel/Foto, ubah per orang, Ubah massal untuk baris terpilih, Ekspor CSV, dan Import & perbaiki CSV
 *   (warga baru dan perbaikan data lama dalam satu berkas).
 * Tautan lama (?tab=direktori|anggota|import, /admin/warga, /admin/import) tetap berfungsi: ?tab=import membuka Import.
 */
export default function Warga() {
  const { hak } = useAuth();
  if (!(hak.kelola_anggota || hak.humas || hak.admin)) return <Direktori />;
  return <KelolaWarga />;
}

function KelolaWarga() {
  const { hak, user } = useAuth();
  const { blok, gang, namaGang, alamatPendek } = useSettings();
  const [params, setParams] = useSearchParams();
  const [impor, setImpor] = useState(false);
  const [massal, setMassal] = useState(null); // { daftar, selesai }
  const [tampilan, setTampilan] = useState(bacaTampilan);
  useEffect(() => { try { localStorage.setItem(SIMPAN, tampilan); } catch { /* abaikan */ } }, [tampilan]);

  // Tautan lama ber-?tab=: buang parameternya; tab=import langsung membuka Import
  useEffect(() => {
    const tab = params.get('tab');
    if (!tab) return;
    if (tab === 'import') setImpor(true);
    setParams((p) => { const n = new URLSearchParams(p); n.delete('tab'); return n; }, { replace: true });
  }, [params, setParams]);

  const bukaImpor = useCallback(() => setImpor(true), []);
  const ubahMassal = useCallback((daftar, selesai) => setMassal({ daftar, selesai }), []);
  const konfig = useMemo(() => {
    const k = konfigWarga({ hak, user, blok, gang, namaGang, onImpor: bukaImpor, onUbahMassal: ubahMassal });
    return {
      ...k,
      aksiHeader: <Button size="sm" variant="secondary" icon={FileUp} onClick={bukaImpor}>Import &amp; perbaiki CSV</Button>,
      aksiHeaderMobile: <IconButton icon={FileUp} label="Import & perbaiki CSV" onClick={bukaImpor} />,
    };
  }, [hak, user, blok, gang, namaGang, bukaImpor, ubahMassal]);

  const kartu = useCallback((w) => (
    <Kartu w={w} alamatPendek={alamatPendek} ket={w.status !== 'aktif' ? STATUS_WARGA[w.status]?.label : w.wajib_ganti_pin ? 'Belum ganti PIN' : null} />
  ), [alamatPendek]);
  const pilihTampilan = (
    <SegTabs value={tampilan} onChange={setTampilan} label="Tampilan daftar warga"
      tabs={[{ value: 'tabel', label: 'Tabel' }, { value: 'foto', label: 'Foto' }]} />
  );

  return (
    <HalamanData konfig={konfig} kartu={tampilan === 'foto' ? kartu : undefined} toolbarEnd={pilihTampilan}>
      {({ rows, reload }) => (
        <Suspense fallback={null}>
          {impor && <ImporWarga warga={rows || []} bolehUbah={konfig.bolehUbahData} onClose={() => setImpor(false)} onSelesai={reload} />}
          {massal && <UbahMassal daftar={massal.daftar} onClose={() => setMassal(null)} onSelesai={() => { massal.selesai(); setMassal(null); }} />}
        </Suspense>
      )}
    </HalamanData>
  );
}
