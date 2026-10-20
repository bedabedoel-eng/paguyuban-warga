import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import { LineTabs, Loader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import Direktori from './Direktori';

const DataWarga = lazy(() => import('../admin/DataWarga'));
const ImportWarga = lazy(() => import('../admin/ImportWarga'));

/**
 * Satu menu "Warga": Direktori (semua warga), Data anggota (pengelola wilayah), Import (admin).
 * Tab tersimpan di ?tab= sehingga bisa dibagikan, dan tautan lama /admin/warga serta /admin/import dialihkan ke sini.
 */
export default function Warga() {
  const { hak } = useAuth();
  const [params, setParams] = useSearchParams();
  const bisaData = hak.kelola_anggota || hak.humas;
  const tabs = [
    { value: 'direktori', label: 'Direktori' },
    ...(bisaData ? [{ value: 'anggota', label: 'Data anggota' }] : []),
    ...(hak.admin ? [{ value: 'import', label: 'Import CSV' }] : []),
  ];
  const diminta = params.get('tab');
  const tab = tabs.some((t) => t.value === diminta) ? diminta : 'direktori';
  // Pindah tab = mulai bersih (cari, filter, halaman tiap tab berdiri sendiri)
  const pindah = (v) => setParams(v === 'direktori' ? {} : { tab: v }, { replace: true });

  return (
    <div className="page">
      <PageHeader title="Warga" desc={bisaData ? 'Direktori, data anggota, dan import warga dalam satu tempat.' : 'Kenali tetangga. Nomor HP hanya tampil bila pemiliknya mengizinkan.'} />
      {tabs.length > 1 && <LineTabs value={tab} onChange={pindah} label="Bagian menu warga" tabs={tabs} />}
      <Suspense fallback={<Loader />}>
        {tab === 'direktori' && <Direktori tertanam />}
        {tab === 'anggota' && <DataWarga tertanam />}
        {tab === 'import' && <ImportWarga tertanam />}
      </Suspense>
    </div>
  );
}
