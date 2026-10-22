import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, RotateCcw, Trash2, SearchX } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, IconButton, SkeletonRows, DataTable, useConfirm } from '../ui';
import BarAlat from './BarAlat';
import Pager from './Pager';
import { useToast } from '../../context/ToastContext';
import { useDaftar } from '../../hooks/useDaftar';
import { toCsv, unduhBerkas, stempelTanggal } from '../../lib/csv';
import { pesanError } from '../../lib/errors';

const PRATINJAU_HAPUS = 5;

/**
 * Tabel data lengkap: cari (debounce), filter, sortir, halaman, pilih banyak + hapus terpilih,
 * ekspor CSV, dan seluruh keadaan tersimpan di URL. Tampil sebagai kartu di HP (lewat DataTable).
 *
 * Props penting:
 *   rows, rowKey, columns        data dan kolom (format DataTable: { key, label, render, sort, className })
 *   satuan                       kata benda untuk pesan, mis. 'rumah'
 *   label(row)                   nama baris untuk tombol dan konfirmasi, mis. 'Rumah A 3'
 *   cari: { placeholder, ambil }          ambil(row) = teks yang dicari
 *   filters: [{ key, label, placeholder, options, test(row, nilai), chips?, semuaLabel? }]
 *   onUbah(row)                  tampilkan tombol Ubah
 *   hapus: { kata?, bisa?(row), dampak, jalankan(row), sukses?(n) }     hapus permanen; dampak boleh fungsi (rows) => teks; kata mis. 'Cabut'; judul?(rows) mengganti judul konfirmasi
 *   aksiMassal: [{ kata, tombol?, ikon?, ikonBaris?, danger?, bisa?(row), dampak?, jalankan(row), sukses?(n) }]
 *                                aksi lain untuk baris terpilih (mis. Nonaktifkan); ikonBaris = tombol ikon di tiap baris
 *                                atau { kata, tombol, ikon, bisa?, buka(rows, selesai) }: membuka form sendiri (mis. Ubah massal);
 *                                panggil selesai() setelah berhasil agar pilihan dikosongkan dan data dimuat ulang
 *   kartu(row)                   bila diisi, baris tampil sebagai kartu (mis. tampilan foto) menggantikan tabel
 *   filterBawaan                 filter yang aktif saat URL belum memuatnya (lihat useDaftar)
 *   bisaUbah(row)                menyembunyikan tombol Ubah pada baris tertentu
 *   ekspor: { nama, kolom }      kolom format toCsv; yang diekspor = semua hasil filter (bukan hanya halaman ini)
 *   aksiBaris(row)               tombol tambahan per baris
 *   ringkasan(rowsHasil)         teks ringkas di kaki tabel
 *   onSelesai()                  dipanggil setelah hapus (muat ulang data)
 */
export default function DataManager({
  rows, rowKey = 'id', columns, caption, satuan = 'data', label = () => 'baris',
  cari, filters = [], defaultSort, defaultPer,
  loading, error, onRetry, kosong,
  onUbah, bisaUbah, hapus, aksiMassal = [], aksiBaris, ekspor, ringkasan, toolbarEnd, onSelesai, kartu, filterBawaan,
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const kunci = (r) => (typeof rowKey === 'function' ? rowKey(r) : r[rowKey]);
  const d = useDaftar({ rows, kolom: columns, ambilCari: cari?.ambil, filterDef: filters, defaultSort, defaultPer, filterBawaan });
  const { tampil, hasil } = d;

  /* ---------- aksi untuk baris (hapus + aksi massal) ---------- */
  const aksiList = useMemo(() => [
    ...(hapus ? [{ id: 'hapus', kata: hapus.kata || 'Hapus', danger: true, permanen: true, ikon: Trash2, ikonBaris: true, bisa: hapus.bisa, dampak: hapus.dampak, judul: hapus.judul, jalankan: hapus.jalankan, sukses: hapus.sukses }] : []),
    ...aksiMassal.map((a, i) => ({ id: `aksi${i}`, ...a })),
  ], [hapus, aksiMassal]);
  const bisaAksi = (a, r) => (a.bisa ? a.bisa(r) : true);
  const bisaPilih = (r) => aksiList.some((a) => bisaAksi(a, r));

  const [pilih, setPilih] = useState(() => new Set());
  const [sibuk, setSibuk] = useState(false);
  const dapatDipilihHalaman = tampil.filter(bisaPilih);
  const semuaHalamanTerpilih = dapatDipilihHalaman.length > 0 && dapatDipilihHalaman.every((r) => pilih.has(kunci(r)));
  const sebagianTerpilih = !semuaHalamanTerpilih && dapatDipilihHalaman.some((r) => pilih.has(kunci(r)));
  const terpilih = hasil.filter((r) => pilih.has(kunci(r)) && bisaPilih(r)); // hanya yang terlihat di hasil filter
  const kotakHeader = useRef(null);
  useEffect(() => { if (kotakHeader.current) kotakHeader.current.indeterminate = sebagianTerpilih; }, [sebagianTerpilih]);
  const ubahPilih = (daftar, nyala) => setPilih((s) => { const n = new Set(s); daftar.forEach((r) => (nyala ? n.add(kunci(r)) : n.delete(kunci(r)))); return n; });

  /** Jalankan satu aksi untuk daftar baris: konfirmasi (menyebut jumlah) -> proses satu per satu -> ringkasan hasil. */
  async function jalankanAksi(a, daftar) {
    if (!daftar.length || sibuk) return;
    if (a.buka) {
      a.buka(daftar, () => {
        const ids = new Set(daftar.map(kunci));
        setPilih((s) => new Set([...s].filter((x) => !ids.has(x))));
        onSelesai?.();
      });
      return;
    }
    const n = daftar.length;
    const kerja = a.kata.toLowerCase();
    const contoh = daftar.slice(0, PRATINJAU_HAPUS).map(label).join(', ');
    const sisa = n > PRATINJAU_HAPUS ? ` dan ${n - PRATINJAU_HAPUS} lainnya` : '';
    const dampak = typeof a.dampak === 'function' ? a.dampak(daftar) : a.dampak;
    const text = [n > 1 ? `${n} ${satuan} akan di${kerja}: ${contoh}${sisa}.` : '', dampak, a.permanen ? 'Tindakan ini tidak bisa dibatalkan.' : ''].filter(Boolean).join(' ');
    if (!(await confirm({ title: a.judul ? a.judul(daftar) : n > 1 ? `${a.kata} ${n} ${satuan}?` : `${a.kata} ${label(daftar[0])}?`, text, okLabel: n > 1 ? `${a.kata} ${n} ${satuan}` : a.kata, danger: !!a.danger }))) return;
    setSibuk(true);
    const gagal = [];
    for (const r of daftar) {
      try { await a.jalankan(r); } catch (e) { gagal.push({ r, e }); }
    }
    setSibuk(false);
    const berhasil = n - gagal.length;
    if (berhasil) toast.success(a.sukses ? a.sukses(berhasil) : `${berhasil} ${satuan} berhasil di${kerja}`);
    if (gagal.length) toast.error(n === 1 ? gagal[0].e : `${gagal.length} ${satuan} gagal di${kerja}. ${pesanError(gagal[0].e)}`);
    const gagalSet = new Set(gagal.map((g) => kunci(g.r)));
    setPilih((s) => { const baru = new Set(s); daftar.forEach((r) => { if (!gagalSet.has(kunci(r))) baru.delete(kunci(r)); }); return baru; });
    onSelesai?.();
  }

  /* ---------- kolom ---------- */
  const kolomFinal = useMemo(() => {
    const k = [];
    if (aksiList.length) {
      k.push({
        key: '_pilih', label: '', className: 'pilih-col',
        header: <input ref={kotakHeader} type="checkbox" className="pilih" aria-label="Pilih semua di halaman ini" checked={semuaHalamanTerpilih} disabled={!dapatDipilihHalaman.length}
          onChange={(e) => ubahPilih(dapatDipilihHalaman, e.target.checked)} />,
        render: (r) => (bisaPilih(r)
          ? <input type="checkbox" className="pilih" aria-label={`Pilih ${label(r)}`} checked={pilih.has(kunci(r))} onChange={(e) => ubahPilih([r], e.target.checked)} />
          : null),
      });
    }
    k.push(...columns);
    if (onUbah || aksiList.some((a) => a.ikonBaris) || aksiBaris) {
      k.push({
        key: '_aksi', label: '', className: 'actions',
        render: (r) => (
          <>
            {aksiBaris?.(r)}
            {onUbah && (bisaUbah ? bisaUbah(r) : true) && <IconButton small icon={Pencil} size={16} label={`Ubah ${label(r)}`} onClick={() => onUbah(r)} />}
            {aksiList.filter((a) => a.ikonBaris && a.ikon && bisaAksi(a, r)).map((a) => (
              <IconButton key={a.id} small danger={!!a.danger} icon={a.ikon} size={16} label={`${a.kata} ${label(r)}`} disabled={sibuk} onClick={() => jalankanAksi(a, [r])} />
            ))}
          </>
        ),
      });
    }
    return k;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, aksiList, onUbah, bisaUbah, aksiBaris, pilih, semuaHalamanTerpilih, dapatDipilihHalaman.length, sibuk, label]);

  /* ---------- ekspor ---------- */
  function unduh() {
    if (!hasil.length) return toast.error('Tidak ada data untuk diekspor');
    // ekspor.fungsi(rows) = ekspor khusus yang mengembalikan jumlah baris; selain itu pakai kolom CSV umum
    if (ekspor.fungsi) ekspor.fungsi(hasil);
    else unduhBerkas(`${ekspor.nama}-${stempelTanggal()}.csv`, toCsv(hasil, ekspor.kolom));
    toast.success(`${hasil.length} ${satuan} diekspor ke CSV${d.adaFilter ? ' (sesuai filter)' : ''}`);
  }

  const kosongFilter = (
    <EmptyState icon={SearchX} title={`Tidak ada ${satuan} yang cocok`} text="Ubah kata kunci atau filter."
      action={d.adaFilter ? <Button size="sm" variant="secondary" icon={RotateCcw} onClick={d.reset}>Reset filter</Button> : undefined} />
  );
  const adaData = !!rows?.length;

  return (
    <div className="stack">
      <BarAlat d={d} rows={rows} satuan={satuan} cari={cari} filters={filters} toolbarEnd={toolbarEnd}
        onEkspor={ekspor ? unduh : undefined} eksporMati={!hasil.length} />

      <Card className="flush">
        {loading && !rows ? <div className="card-body"><SkeletonRows n={5} avatar={false} /></div> : error ? <ErrorState error={error} onRetry={onRetry} /> : (
          <>
            {terpilih.length > 0 && (
              <div className="bulkbar" role="region" aria-label="Tindakan untuk baris terpilih">
                <span className="strong">{terpilih.length} {satuan} dipilih</span>
                {semuaHalamanTerpilih && hasil.length > tampil.length && terpilih.length < hasil.filter(bisaPilih).length && (
                  <button type="button" className="link" onClick={() => ubahPilih(hasil.filter(bisaPilih), true)}>Pilih semua {hasil.filter(bisaPilih).length} hasil</button>
                )}
                <span className="grow" />
                <Button size="sm" variant="secondary" onClick={() => setPilih(new Set())}>Batal pilih</Button>
                {aksiList.map((a) => {
                  const untuk = terpilih.filter((r) => bisaAksi(a, r));
                  return (
                    <Button key={a.id} size="sm" variant={a.danger ? 'danger' : 'secondary'} icon={a.ikon} loading={sibuk} disabled={!untuk.length}
                      onClick={() => jalankanAksi(a, untuk)}>{a.tombol || `${a.kata} terpilih`}{untuk.length !== terpilih.length || aksiList.length > 1 ? ` (${untuk.length})` : ''}</Button>
                  );
                })}
              </div>
            )}
            {kartu ? (tampil.length
              ? <div className="card-body"><div className="dir-grid">{tampil.map((r) => <div key={kunci(r)} className="dir-cell">{kartu(r)}</div>)}</div></div>
              : (adaData ? kosongFilter : <EmptyState icon={kosong?.icon} title={kosong?.title || `Belum ada ${satuan}`} text={kosong?.text} action={kosong?.action} />))
            : <DataTable columns={kolomFinal} rows={tampil} rowKey={rowKey} caption={caption} sort={d.sort} onSort={d.setSort}
              empty={adaData ? kosongFilter : <EmptyState icon={kosong?.icon} title={kosong?.title || `Belum ada ${satuan}`} text={kosong?.text} action={kosong?.action} />} />}
          </>
        )}
        {adaData && <Pager d={d} satuan={satuan} ringkasan={ringkasan ? ringkasan(hasil) : undefined} />}
      </Card>
    </div>
  );
}
