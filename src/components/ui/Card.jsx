import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Card({ children, className = '', pad, as: As = 'section', ...rest }) {
  return <As className={['card', pad && 'pad', className].filter(Boolean).join(' ')} {...rest}>{children}</As>;
}

/** Kepala kartu: judul, deskripsi singkat, dan aksi/tautan di kanan. */
export function CardHead({ title, desc, action, to, actionLabel = 'Lihat semua' }) {
  return (
    <div className="card-head">
      <div className="t">
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action || (to && <Link to={to} className="link">{actionLabel}<ChevronRight size={14} aria-hidden="true" /></Link>)}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function SectionHead({ title, to, actionLabel = 'Lihat semua', action }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action || (to && <Link to={to} className="link">{actionLabel}<ChevronRight size={14} aria-hidden="true" /></Link>)}
    </div>
  );
}
