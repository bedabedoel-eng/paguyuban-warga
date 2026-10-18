import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { urutkan } from '../../lib/sort';

/**
 * Tabel responsif: di HP tiap baris menjadi kartu dengan label kolom.
 * columns: [{ key, label, render?(row), className?, mobileLabel?, sort?: (row) => nilai }]
 *   - sort: kolom bisa diurutkan (klik judul; di HP lewat pilihan "Urutkan").
 * defaultSort: { key, dir: 'asc' | 'desc' }
 */
export default function DataTable({ columns, rows, rowKey = 'id', empty, caption, defaultSort }) {
  const [urut, setUrut] = useState(defaultSort || null);
  const kolom = urut ? columns.find((c) => c.key === urut.key && c.sort) : null;
  const data = useMemo(() => (kolom ? urutkan(rows, kolom.sort, urut.dir) : rows), [rows, kolom, urut]);
  if (!rows?.length) return empty || null;
  const bisaUrut = columns.filter((c) => c.sort);
  const klik = (c) => setUrut((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }));
  const pilihan = bisaUrut.flatMap((c) => [{ v: `${c.key}|asc`, l: `${c.label}: A–Z / kecil–besar` }, { v: `${c.key}|desc`, l: `${c.label}: Z–A / besar–kecil` }]);
  return (
    <div className="table-wrap">
      {bisaUrut.length > 0 && (
        <div className="sort-m">
          <select className="select" aria-label="Urutkan" value={urut ? `${urut.key}|${urut.dir}` : ''}
            onChange={(e) => { const [key, dir] = e.target.value.split('|'); setUrut(key ? { key, dir } : null); }}>
            <option value="">Urutkan…</option>
            {pilihan.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </div>
      )}
      <table className="table stackable">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const aktif = urut?.key === c.key && c.sort;
              const Ikon = !aktif ? ArrowUpDown : urut.dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <th key={c.key} scope="col" className={c.className} aria-sort={aktif ? (urut.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sort
                    ? <button type="button" className="sort" onClick={() => klik(c)}>{c.label}<Ikon size={13} aria-hidden="true" /></button>
                    : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={typeof rowKey === 'function' ? rowKey(r) : r[rowKey]}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.mobileLabel ?? c.label} className={c.className}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
