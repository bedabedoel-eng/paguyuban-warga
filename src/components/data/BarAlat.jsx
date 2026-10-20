import { Download, RotateCcw } from 'lucide-react';
import { Button, Chips, SearchInput, Select } from '../ui';
import { hitungPilihan } from '../../lib/daftar';

/**
 * Bilah alat daftar data: kotak cari, filter (pilihan atau chip berangka), Reset filter, Ekspor, dan keterangan jumlah hasil.
 * Dipakai bersama oleh DataManager (tabel) dan DaftarKartu (kartu), supaya tampilan dan perilakunya sama.
 *
 * d       keadaan dari useDaftar
 * filters [{ key, label, placeholder, options, chips?, semuaLabel?, tanpaHitung? }]
 * onEkspor / eksporMati   tombol Ekspor CSV (tampil bila onEkspor diberikan)
 * urutan  node tambahan (mis. pilihan urutan) di ujung kanan
 */
export default function BarAlat({ d, rows, satuan, cari, filters = [], onEkspor, eksporMati, toolbarEnd, urutan }) {
  const chipsFilters = filters.filter((f) => f.chips);
  const selectFilters = filters.filter((f) => !f.chips);
  const ada = !!rows?.length;
  const hitung = (f, nilai) => (f.tanpaHitung ? undefined : hitungPilihan(rows || [], filters, d.filter, f.key, nilai, { cari: d.cari, ambilCari: cari?.ambil }));
  return (
    <>
      {(cari || selectFilters.length > 0 || onEkspor || toolbarEnd || urutan) && (
        <div className="toolbar">
          {cari && <SearchInput value={d.q} onChange={d.setQ} placeholder={cari.placeholder} label={`Cari ${satuan}`} />}
          {selectFilters.map((f) => (
            <Select key={f.key} className="sm" value={d.filter[f.key]} onChange={(e) => d.setFilter(f.key, e.target.value)}
              placeholder={f.placeholder} options={f.options} aria-label={f.label} />
          ))}
          {d.adaFilter && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={d.reset}>Reset filter</Button>}
          <span className="grow" />
          {urutan}
          {onEkspor && <Button size="sm" variant="secondary" icon={Download} onClick={onEkspor} disabled={eksporMati}>Ekspor CSV</Button>}
          {toolbarEnd}
        </div>
      )}
      {chipsFilters.map((f) => (
        <Chips key={f.key} label={f.label} value={d.filter[f.key]} onChange={(v) => d.setFilter(f.key, v)}
          tabs={[{ value: '', label: f.semuaLabel || 'Semua', n: hitung(f, '') }, ...f.options.map((o) => ({ value: o.value, label: o.label, n: hitung(f, o.value) }))]} />
      ))}
      {d.adaFilter && ada && <p className="text-sm muted" aria-live="polite">{d.total} {satuan} sesuai filter dari {rows.length}</p>}
    </>
  );
}
