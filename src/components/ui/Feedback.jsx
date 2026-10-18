import { Loader2, Inbox, CircleAlert, RefreshCw, Info, CircleCheck, TriangleAlert } from 'lucide-react';
import Button from './Button';

export function Loader({ label = 'Memuat…' }) {
  return <div className="loader" role="status"><Loader2 className="spin" size={26} /><span className="sr-only">{label}</span></div>;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Belum ada data', text, action, compact }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <span className="ico neutral"><Icon size={24} aria-hidden="true" /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty">
      <span className="ico bad"><CircleAlert size={24} aria-hidden="true" /></span>
      <h3>Data gagal dimuat</h3>
      <p>{error}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>Muat ulang</Button>}
    </div>
  );
}

const CALLOUT_ICON = { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: CircleAlert, neutral: Info };
/** Pesan sebaris. tone: info | ok | warn | bad | neutral */
export function Callout({ tone = 'info', icon, children, action }) {
  const Icon = icon === false ? null : icon || CALLOUT_ICON[tone];
  return (
    <div className={`callout ${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <div className="grow">{children}</div>
      {action}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r, style }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />;
}

/** Kerangka daftar saat memuat. */
export function SkeletonRows({ n = 3, avatar = true }) {
  return (
    <div className="sk-rows" role="status" aria-label="Memuat">
      {Array.from({ length: n }, (_, i) => (
        <div className="sk-row" key={i}>
          {avatar && <Skeleton h={40} w={40} r={10} />}
          <div className="grow stack-sm"><Skeleton h={12} w="60%" /><Skeleton h={10} w="35%" /></div>
        </div>
      ))}
    </div>
  );
}

/** Bungkus status memuat/galat/kosong untuk hasil useAsync. */
export function AsyncView({ state, empty, children, emptyProps, skeleton }) {
  if (state.loading && state.data === undefined) return skeleton || <Loader />;
  if (state.error && state.data === undefined) return <ErrorState error={state.error} onRetry={state.reload} />;
  const d = state.data;
  if (empty !== false && (d == null || (Array.isArray(d) && d.length === 0))) return empty || <EmptyState {...emptyProps} />;
  return children(d);
}
