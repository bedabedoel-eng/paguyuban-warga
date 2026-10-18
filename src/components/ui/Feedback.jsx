import { Loader2, Inbox, CircleAlert } from 'lucide-react';
import Button from './Button';

export function Loader({ label = 'Memuat…' }) {
  return <div className="loader" role="status"><Loader2 className="spin" size={28} /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Belum ada data', text, action }) {
  return (
    <div className="empty">
      <span className="icon-circle"><Icon size={26} /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <span className="icon-circle tone-red"><CircleAlert size={26} /></span>
      <h3>Gagal memuat</h3>
      <p>{error}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}

export function Alert({ tone = 'info', icon: Icon, children }) {
  return <div className={`alert ${tone}`}>{Icon && <Icon size={16} />}<div>{children}</div></div>;
}

export function Skeleton({ h = 16, w = '100%', r = 8, style }) {
  return <span className="skeleton" style={{ display: 'block', height: h, width: w, borderRadius: r, ...style }} />;
}

/** Bungkus status memuat/galat/kosong untuk hasil useAsync. */
export function AsyncView({ state, empty, children, emptyProps }) {
  if (state.loading && state.data === undefined) return <Loader />;
  if (state.error && state.data === undefined) return <ErrorState error={state.error} onRetry={state.reload} />;
  const d = state.data;
  if (empty !== false && (d == null || (Array.isArray(d) && d.length === 0))) return empty || <EmptyState {...emptyProps} />;
  return children(d);
}
