/** Tab segmen untuk mengganti tampilan dalam satu halaman. */
export function SegTabs({ tabs, value, onChange, label = 'Tampilan', block }) {
  return (
    <div className={`seg ${block ? 'block' : ''}`} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}{t.count > 0 && <span className="count" style={{ background: 'var(--kunyit-500)', color: 'var(--hutan-950)' }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Tab bergaris untuk bagian halaman. */
export function LineTabs({ tabs, value, onChange, label = 'Bagian' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}{t.count > 0 && <span className="count" style={{ background: 'var(--kunyit-500)', color: 'var(--hutan-950)' }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Chip filter. */
export function Chips({ tabs, value, onChange, label = 'Filter' }) {
  return (
    <div className="chips" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}{t.n != null && <span className="n">{t.n}</span>}
        </button>
      ))}
    </div>
  );
}
