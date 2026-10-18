import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Tombol serbaguna. variant: primary|outline|ghost|light|danger|danger-outline|gold; size: sm|xs|lg */
export default function Button({ variant = 'primary', size, block, loading, icon: Icon, children, to, className = '', ...rest }) {
  const cls = ['btn', variant !== 'primary' && variant, size, block && 'block', className].filter(Boolean).join(' ');
  const content = (
    <>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={size === 'xs' ? 14 : 16} /> : null}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
}
