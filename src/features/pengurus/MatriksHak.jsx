import { Check, Minus } from 'lucide-react';
import { Card, CardHead, CardBody } from '../../components/ui';
import { MATRIKS } from '../../lib/akses';

function Sel({ v }) {
  if (v === true) return <Check size={16} className="yes" aria-label="Ya" />;
  if (v === false) return <Minus size={16} className="no" aria-label="Tidak" />;
  return <span className="part">{v}</span>;
}

/** Kartu ringkasan hak akses per peran (dipindah apa adanya dari KelolaPengurus.jsx). */
export default function MatriksHak() {
  return (
      <Card>
        <CardHead title="Hak akses per peran" desc="Diterapkan otomatis di database (RLS)" />
        <div className="table-wrap">
          <table className="table matrix">
            <thead><tr><th>Tindakan</th><th>Ketua</th><th>Wakil</th><th>Sekretaris</th><th>Bendahara</th><th>Humas jalan</th></tr></thead>
            <tbody>{MATRIKS.map((m) => <tr key={m.aksi}><td className="text-sm">{m.aksi}</td>{['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas'].map((k) => <td key={k}><Sel v={m[k]} /></td>)}</tr>)}</tbody>
          </table>
        </div>
        <CardBody><p className="text-xs muted">Seksi/anggota pengurus dapat melihat arsip dan data pengurus, tanpa hak mengubah. Admin sistem memiliki semua akses serta pengaturan aplikasi.</p></CardBody>
      </Card>
  );
}
