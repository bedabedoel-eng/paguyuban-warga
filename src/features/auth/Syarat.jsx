import { useSettings } from '../../context/SettingsContext';

export default function Syarat() {
  const { pengaturan } = useSettings();
  return (
    <div className="stack sm text-2 small" style={{ lineHeight: 1.65 }}>
      <p>Aplikasi ini dikelola oleh pengurus <b>{pengaturan.nama_paguyuban}</b> untuk keperluan internal warga.</p>
      <p><b>Data yang dikumpulkan:</b> nama, nomor HP, blok dan nomor rumah, serta data profil yang Anda isi sendiri (pekerjaan, hobi, foto).</p>
      <p><b>Siapa yang dapat melihat:</b> nama, blok/nomor rumah, pekerjaan, dan foto dapat dilihat sesama anggota aktif. Nomor HP hanya terlihat oleh pengurus, dan oleh anggota lain bila Anda mengizinkannya di menu Privasi. Tagihan IPL dan laporan Anda hanya terlihat oleh Anda dan pengurus terkait.</p>
      <p><b>Penggunaan:</b> data hanya dipakai untuk administrasi paguyuban (iuran, informasi, kegiatan) dan tidak diperjualbelikan atau dibagikan ke pihak lain.</p>
      <p><b>Hak Anda:</b> Anda dapat memperbarui profil kapan saja dan meminta admin menghapus akun beserta data Anda.</p>
      <p><b>Kewajiban:</b> memberikan data yang benar, menjaga kerahasiaan PIN, dan menggunakan aplikasi dengan santun.</p>
    </div>
  );
}
