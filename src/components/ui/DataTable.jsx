/**
 * Tabel responsif: di HP tiap baris menjadi kartu dengan label kolom.
 * columns: [{ key, label, render?(row), className?, hideMobile? }]
 */
export default function DataTable({ columns, rows, rowKey = 'id', empty, caption }) {
  if (!rows?.length) return empty || null;
  return (
    <div className="table-wrap">
      <table className="table stackable">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
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
