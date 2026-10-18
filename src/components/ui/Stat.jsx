import { Link } from 'react-router-dom';
import { Skeleton } from './Feedback';

/** Kartu angka ringkas. */
export default function Stat({ icon: Icon, tone = '', label, value, sub, to, loading, meter }) {
  const body = (
    <>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className={`ico sm ${tone}`}><Icon size={16} aria-hidden="true" /></span>}
      </div>
      {loading ? <Skeleton h={28} w="60%" /> : <span className="stat-value">{value}</span>}
      {meter != null && <div className="meter" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} /></div>}
      {sub && <span className="stat-sub">{sub}</span>}
    </>
  );
  return to ? <Link to={to} className="card stat">{body}</Link> : <div className="card stat">{body}</div>;
}
