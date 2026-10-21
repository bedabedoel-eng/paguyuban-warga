import { Download, KeyRound } from 'lucide-react';
import { Badge, Button, Callout, DataTable } from '../../components/ui';
import { formatHp } from '../../lib/phone';
import { unduhPinAwal } from '../../lib/pinAwal';

/**
 * Daftar PIN awal acak yang baru dibuat. PIN hanya ada di layar ini: database hanya menyimpan hash-nya,
 * jadi setelah halaman ditutup PIN tidak bisa dilihat lagi (gunakan "Atur ulang PIN" bila hilang).
 */
export default function PinAwalHasil({ akun, nama = 'pin-awal-warga' }) {
  if (!akun?.length) return null;
  const cols = [
    { key: 'nama', label: 'Nama', render: (x) => <span className="cell-main">{x.nama}</span> },
    { key: 'hp', label: 'Nomor HP', render: (x) => <span className="num nowrap">{formatHp(x.hp)}</span> },
    { key: 'pin', label: 'PIN awal', render: (x) => <Badge tone="brand"><span className="num">{x.pin}</span></Badge> },
  ];
  return (
    <div className="stack-sm">
      <Callout tone="warn">
        PIN awal di bawah ini <b>hanya ditampilkan sekali</b> dan tidak tersimpan di sistem. Unduh berkasnya sekarang, lalu sampaikan
        PIN ke tiap warga lewat pesan pribadi. Hapus berkas setelah dibagikan. Warga wajib membuat PIN baru saat pertama masuk.
      </Callout>
      <div className="row wrap">
        <Button size="sm" icon={Download} onClick={() => unduhPinAwal(akun, nama)}>Unduh CSV (nama, HP, PIN awal)</Button>
        <span className="text-sm muted row" style={{ gap: 6 }}><KeyRound size={14} />{akun.length} akun</span>
      </div>
      <DataTable columns={cols} rows={akun.slice(0, 300)} rowKey="hp" caption="PIN awal warga" />
      {akun.length > 300 && <p className="text-sm muted">Menampilkan 300 dari {akun.length} akun; berkas CSV memuat semuanya.</p>}
    </div>
  );
}
