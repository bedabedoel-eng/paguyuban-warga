/** Tab segmen (latar abu, tab aktif hijau penuh). */
export function SegTabs({ tabs, value, onChange, label = 'Tab' }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  );
}

/** Tab pil (kategori). */
export function PillTabs({ tabs, value, onChange, label = 'Filter' }) {
  return (
    <div className="pills" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  );
}
