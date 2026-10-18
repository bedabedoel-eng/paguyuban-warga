import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Card({ children, className = '', pad, as: As = 'section', ...rest }) {
  return <As className={`card ${pad ? 'card-pad' : ''} ${className}`} {...rest}>{children}</As>;
}

export function CardHead({ title, action, to, actionLabel = 'Lihat Semua', icon: Icon }) {
  return (
    <div className="card-head">
      <h2 className="row">{Icon && <Icon size={18} className="green" />}{title}</h2>
      {action || (to && <Link to={to} className="link-sm">{actionLabel}<ChevronRight size={14} /></Link>)}
    </div>
  );
}

export function SectionTitle({ title, to, actionLabel = 'Lihat Semua' }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {to && <Link to={to} className="link-sm">{actionLabel}<ChevronRight size={14} /></Link>}
    </div>
  );
}
