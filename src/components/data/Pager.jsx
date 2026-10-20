import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Select } from '../ui';
import { UKURAN_HALAMAN } from '../../lib/daftar';

/** Kaki daftar: ringkasan di kiri, nomor halaman dan jumlah baris per halaman di kanan. d = keadaan dari useDaftar. */
export default function Pager({ d, ringkasan, satuan, dalamKartu = true }) {
  if (!d.total) return null;
  return (
    <div className={`${dalamKartu ? 'card-foot ' : ''}pager`}>
      <span className="text-sm muted">{ringkasan ?? `${d.total} ${satuan}`}</span>
      <span className="pager-nav">
        <span className="text-sm muted">{d.dari + 1}–{d.sampai} dari {d.total}</span>
        <Select className="sm" value={d.per} onChange={(e) => d.setPer(Number(e.target.value))} aria-label="Jumlah baris per halaman"
          options={UKURAN_HALAMAN.map((n) => ({ value: n, label: `${n} / halaman` }))} />
        <IconButton small icon={ChevronLeft} size={16} label="Halaman sebelumnya" disabled={d.halaman <= 1} onClick={() => d.setHal(d.halaman - 1)} />
        <span className="text-sm num" aria-live="polite">Hal. {d.halaman}/{d.jumlahHalaman}</span>
        <IconButton small icon={ChevronRight} size={16} label="Halaman berikutnya" disabled={d.halaman >= d.jumlahHalaman} onClick={() => d.setHal(d.halaman + 1)} />
      </span>
    </div>
  );
}
