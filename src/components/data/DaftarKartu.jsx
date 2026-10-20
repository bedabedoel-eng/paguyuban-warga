import { useMemo } from 'react';
import { RotateCcw, SearchX } from 'lucide-react';
import { Button, Card, CardBody, EmptyState, ErrorState, SkeletonRows, SortSelect } from '../ui';
import { useDaftar } from '../../hooks/useDaftar';
import BarAlat from './BarAlat';
import Pager from './Pager';

/**
 * Daftar berbentuk kartu/baris dengan cari (debounce), filter, urutan, halaman, dan keadaan di URL.
 * Padanan DataManager untuk daftar yang bukan tabel (pengumuman, surat, aspirasi, kegiatan).
 *
 * rows, loading, error, onRetry, rowKey, satuan
 * cari: { placeholder, ambil(row) }
 * filters: [{ key, label, chips?, options, test(row, nilai), semuaLabel?, tanpaHitung? }]
 * filterBawaan: { kunci: nilai }  filter aktif bila URL belum memuatnya
 * urutan: [{ key, label, sort?(row), dir? }]   opsi tanpa `sort` = urutan bawaan dari server (dipilih lewat setSort(null))
 * defaultUrutan: key opsi urutan awal
 * renderItem(row) -> node (beri `key`)
 * bungkus: 'daftar' = baris di dalam satu Card; 'kartu' = tiap item sudah berupa Card
 * kosong: node saat belum ada data;  kosongFilter(d): node saat filter menyembunyikan semua data (opsional)
 */
export default function DaftarKartu({
  rows, loading, error, onRetry, satuan = 'data', cari, filters = [], filterBawaan, urutan = [], defaultUrutan,
  defaultPer, renderItem, bungkus = 'kartu', kosong, kosongFilter, ringkasan, toolbarEnd,
}) {
  const kolom = useMemo(() => urutan.map((o) => ({ key: o.key, sort: o.sort })), [urutan]);
  const opsiAwal = urutan.find((o) => o.key === defaultUrutan) || urutan[0];
  const defaultSort = opsiAwal?.sort ? { key: opsiAwal.key, dir: opsiAwal.dir || 'asc' } : null;
  const d = useDaftar({ rows, kolom, ambilCari: cari?.ambil, filterDef: filters, defaultSort, filterBawaan, defaultPer: defaultPer ?? (bungkus === 'daftar' ? 25 : 10) });

  const nilaiUrutan = d.sort?.key ?? urutan.find((o) => !o.sort)?.key ?? urutan[0]?.key;
  const pilihUrutan = (v) => {
    const o = urutan.find((x) => x.key === v);
    d.setSort(o?.sort ? { key: o.key, dir: o.dir || 'asc' } : null);
  };
  const adaData = !!rows?.length;
  const bungkusKosong = (isi) => (bungkus === 'daftar' ? <Card><CardBody>{isi}</CardBody></Card> : <Card>{isi}</Card>);
  const kosongCocok = kosongFilter ? kosongFilter(d) : (
    <EmptyState icon={SearchX} title={`Tidak ada ${satuan} yang cocok`} text="Ubah kata kunci atau filter."
      action={d.adaFilter ? <Button size="sm" variant="secondary" icon={RotateCcw} onClick={d.reset}>Reset filter</Button> : undefined} />
  );

  let isi;
  if (loading && !rows) isi = <Card pad><SkeletonRows n={3} /></Card>;
  else if (error) isi = <ErrorState error={error} onRetry={onRetry} />;
  else if (!d.total) isi = bungkusKosong(adaData ? kosongCocok : kosong);
  else if (bungkus === 'daftar') {
    isi = <Card><CardBody><div className="rows">{d.tampil.map(renderItem)}</div></CardBody><Pager d={d} satuan={satuan} ringkasan={ringkasan?.(d.hasil)} /></Card>;
  } else {
    isi = <>{d.tampil.map(renderItem)}<Pager d={d} satuan={satuan} ringkasan={ringkasan?.(d.hasil)} dalamKartu={false} /></>;
  }

  return (
    <div className="stack">
      <BarAlat d={d} rows={rows} satuan={satuan} cari={cari} filters={filters} toolbarEnd={toolbarEnd}
        urutan={urutan.length > 1 ? <SortSelect value={nilaiUrutan} onChange={pilihUrutan} options={urutan.map((o) => ({ value: o.key, label: o.label }))} /> : null} />
      {isi}
    </div>
  );
}
