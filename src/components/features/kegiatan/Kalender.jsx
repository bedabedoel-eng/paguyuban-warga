import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BULAN, isoDate } from '../../lib/format';

const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Kalender bulanan; hari bertanda titik emas bila ada kegiatan. */
export default function Kalender({ bulan, onBulan, terpilih, onPilih, adaKegiatan = new Set() }) {
  const y = bulan.getFullYear(); const m = bulan.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const hari = isoDate();
  return (
    <div className="card cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => onBulan(new Date(y, m - 1, 1))} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button>
        <b>{BULAN[m]} {y}</b>
        <button className="icon-btn" onClick={() => onBulan(new Date(y, m + 1, 1))} aria-label="Bulan berikutnya"><ChevronRight size={18} /></button>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <span key={d} className="dow">{d}</span>)}
        {cells.map((d) => {
          const k = isoDate(d);
          const cls = [d.getMonth() !== m && 'out', k === hari && 'today', k === terpilih && 'sel', adaKegatan(adaKegiatan, k) && 'has'].filter(Boolean).join(' ');
          return <button key={k} className={cls} onClick={() => onPilih(k === terpilih ? null : k)} aria-label={`${d.getDate()} ${BULAN[d.getMonth()]}`} aria-pressed={k === terpilih}>{d.getDate()}</button>;
        })}
      </div>
    </div>
  );
}
const adaKegatan = (set, k) => set.has(k);
