import { Link } from 'react-router-dom';
import { useTugas } from '../../context/TugasContext';

/** Delapan kotak pintasan; kotak ke-8 selalu "Semua menu". */
export default function MenuCepat({ items, judul = 'Menu cepat' }) {
  const { stat } = useTugas();
  return (
    <section className="stack-sm" aria-labelledby="menu-cepat-h">
      <div className="section-head"><h2 id="menu-cepat-h">{judul}</h2></div>
      <nav className="quick" aria-label={judul}>
        {items.map(({ to, label, icon: Icon, tone, badge, semua }) => {
          const n = badge ? stat?.[badge] || 0 : 0;
          return (
            <Link key={to + label} to={to} className={`quick-item ${semua ? 'semua' : ''}`}>
              <span className={`qi-ico ${tone}`}>
                <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                {n > 0 && <span className="count" aria-label={`${n} menunggu`}>{n > 99 ? '99+' : n}</span>}
              </span>
              <span className="qi-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
