import { useSettings } from '../../context/SettingsContext';

export default function Syarat() {
  const { pengaturan } = useSettings();
  return (
    <div className="stack-sm ink-2 text-sm" style={{ lineHeight: 1.65 }}>
      <p>Aplikasi ini dikelola pengurus <b>{pengaturan.nama_paguyuban}</b> untuk keperluan internal warga.</p>
      <p><b>Data yang dikumpulkan:</b> nama, nomor HP, alamat (blok, nomor rumah, jalan), serta data profil yang Anda isi sendiri (pekerjaan, hobi, foto).</p>
      <p><b>Siapa yang dapat melihat:</b> nama, rumah, pekerjaan, dan foto terlihat sesama anggota aktif. Nomor HP hanya terlihat oleh pengurus yang berwenang (sekretaris, pimpinan, bendahara, dan humas jalan Anda), dan oleh warga lain bila Anda mengizinkan di menu Privasi. Tagihan IPL dan aspirasi Anda hanya terlihat oleh Anda dan pengurus terkait.</p>
      <p><b>Penggunaan:</b> data hanya dipakai untuk administrasi paguyuban (iuran, informasi, kegiatan) dan tidak diperjualbelikan atau dibagikan ke pihak lain.</p>
      <p><b>Hak Anda:</b> memperbarui profil kapan saja dan meminta admin menghapus akun beserta data Anda.</p>
      <p><b>Kewajiban:</b> memberikan data yang benar, menjaga kerahasiaan PIN, dan menggunakan aplikasi dengan santun.</p>
    </div>
  );
}
