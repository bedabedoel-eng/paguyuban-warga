import Logo from '../../components/illustrations/Logo';

export default function BelumDikonfigurasi() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card pad stack" style={{ maxWidth: 560 }}>
        <div className="row"><Logo size={40} tile /><h1 style={{ fontSize: 'var(--fs-xl)' }}>Aplikasi belum dikonfigurasi</h1></div>
        <p className="ink-2">Isi variabel berikut di <code>.env.local</code> (lokal) atau di Cloudflare Pages &gt; Settings &gt; Variables and Secrets, lalu bangun ulang aplikasi:</p>
        <pre style={{ background: 'var(--surface-3)', padding: 12, borderRadius: 8, overflow: 'auto', margin: 0 }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=anon-atau-publishable-key
VITE_AUTH_EMAIL_DOMAIN=akun.domainanda.id
VITE_GOOGLE_LOGIN=false`}
        </pre>
        <p className="text-sm muted">Panduan lengkap ada di README.md.</p>
      </div>
    </div>
  );
}
