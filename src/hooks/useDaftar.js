import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from './useDebounce';
import { olahDaftar, angkaParam, UKURAN_HALAMAN, UKURAN_BAWAAN } from '../lib/daftar';

/**
 * Keadaan daftar data yang tersimpan di URL (?q=&urut=&arah=&hal=&per=&<filter>=...),
 * sehingga tetap ada saat halaman dimuat ulang dan bisa dibagikan.
 * Perubahan memakai replace agar tombol "kembali" tidak penuh dengan riwayat ketikan.
 *
 * opsi: { rows, kolom, ambilCari, filterDef: [{ key, test(row, nilai) }], defaultSort, defaultPer, filterBawaan }
 * filterBawaan: { [kunci]: nilai } = filter yang aktif saat URL belum memuatnya (mis. { status: 'aktif' }).
 *   Memilih "Semua" ditulis sebagai ?kunci=semua supaya tidak kembali ke nilai bawaan.
 */
export function useDaftar({ rows, kolom = [], ambilCari, filterDef = [], defaultSort = null, defaultPer = UKURAN_BAWAAN, filterBawaan = {} }) {
  const [params, setParams] = useSearchParams();
  const ubah = useCallback((perubahan) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      for (const [k, v] of Object.entries(perubahan)) {
        if (v === undefined || v === null || v === '') n.delete(k); else n.set(k, String(v));
      }
      return n;
    }, { replace: true });
  }, [setParams]);

  // Kotak cari: nilai ketikan langsung, URL diperbarui setelah jeda (debounce).
  const qUrl = params.get('q') || '';
  const [qKetik, setQKetik] = useState(qUrl);
  const qTunda = useDebounce(qKetik.trim(), 300);
  const qTerakhir = useRef(qUrl);
  useEffect(() => {
    if (qTunda === qTerakhir.current) return;
    qTerakhir.current = qTunda;
    ubah({ q: qTunda, hal: '' });
  }, [qTunda, ubah]);
  // Bila URL berubah dari luar (mis. tombol kembali), ketikan mengikuti.
  useEffect(() => {
    if (qUrl !== qTerakhir.current) { qTerakhir.current = qUrl; setQKetik(qUrl); }
  }, [qUrl]);

  const filter = useMemo(() => Object.fromEntries(filterDef.map((f) => {
    const mentah = params.get(f.key);
    return [f.key, mentah === null ? (filterBawaan[f.key] || '') : mentah === 'semua' ? '' : mentah];
  })), [filterDef, params, filterBawaan]);
  const kunciUrut = params.get('urut');
  const sort = useMemo(() => {
    const k = kolom.find((c) => c.key === kunciUrut && c.sort);
    if (k) return { key: k.key, dir: params.get('arah') === 'desc' ? 'desc' : 'asc' };
    return defaultSort && !kunciUrut ? defaultSort : null;
  }, [kolom, kunciUrut, params, defaultSort]);
  const per = angkaParam(params.get('per'), defaultPer, UKURAN_HALAMAN);
  const halMinta = angkaParam(params.get('hal'), 1);

  // Kotak dikosongkan = hasil langsung penuh kembali, tanpa menunggu jeda.
  const cari = qKetik.trim() === '' ? '' : qTunda;
  const hasil = useMemo(
    () => olahDaftar(rows || [], { cari, ambilCari, filter, filterDef, sort, kolom, hal: halMinta, per }),
    [rows, cari, ambilCari, filter, filterDef, sort, kolom, halMinta, per],
  );

  const setFilter = useCallback((key, nilai) => ubah({ [key]: nilai === '' && filterBawaan[key] ? 'semua' : nilai, hal: '' }), [ubah, filterBawaan]);
  const setSort = useCallback((s) => ubah({ urut: s?.key, arah: s && s.dir === 'desc' ? 'desc' : '', hal: '' }), [ubah]);
  const setHal = useCallback((h) => ubah({ hal: h > 1 ? h : '' }), [ubah]);
  const setPer = useCallback((n) => ubah({ per: n === defaultPer ? '' : n, hal: '' }), [ubah, defaultPer]);
  const reset = useCallback(() => {
    qTerakhir.current = '';
    setQKetik('');
    ubah({ q: '', hal: '', ...Object.fromEntries(filterDef.map((f) => [f.key, ''])) });
  }, [ubah, filterDef]);

  const adaFilter = !!(qUrl || qKetik.trim()) || filterDef.some((f) => filter[f.key] !== (filterBawaan[f.key] || ''));
  return { q: qKetik, cari, setQ: setQKetik, filter, setFilter, sort, setSort, per, setPer, setHal, reset, adaFilter, ...hasil };
}
