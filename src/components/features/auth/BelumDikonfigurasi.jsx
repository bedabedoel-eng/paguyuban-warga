import Logo from '../../components/illustrations/Logo';

export default function BelumDikonfigurasi() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card card-pad" style={{ maxWidth: 520 }}>
        <div className="row" style={{ marginBottom: 12 }}><Logo size={44} /><h1 style={{ fontSize: 18 }}>Aplikasi belum dikonfigurasi</h1></div>
        <p className="text-2">Isi variabel lingkungan berikut di file <code>.env.local</code> (lokal) atau di Cloudflare Pages &gt; Settings &gt; Variables and Secrets, lalu bangun ulang:</p>
        <pre style={{ background: '#f3f5f7', padding: 12, borderRadius: 8, overflow: 'auto', fontSize: 12 }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=anon-atau-publishable-key
VITE_AUTH_EMAIL_DOMAIN=akun.domainanda.id
VITE_GOOGLE_LOGIN=false`}
        </pre>
        <p className="small muted">Panduan lengkap ada di README.md.</p>
      </div>
    </div>
  );
}
