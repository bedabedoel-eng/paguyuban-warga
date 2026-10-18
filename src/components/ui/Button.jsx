import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Tombol serbaguna.
 * variant: primary | secondary | ghost | soft | danger | danger-soft | accent | on-dark
 * size: xs | sm | md | lg; iconOnly untuk tombol ikon persegi (wajib aria-label).
 */
export default function Button({ variant = 'primary', size, block, loading, icon: Icon, iconRight: IconRight, iconOnly, children, to, href, className = '', ...rest }) {
  const cls = ['btn', variant !== 'primary' && variant, size, block && 'block', iconOnly && 'icon', className].filter(Boolean).join(' ');
  const s = size === 'xs' ? 14 : size === 'lg' ? 18 : 16;
  const content = (
    <>
      {loading ? <Loader2 size={s} className="spin" aria-hidden="true" /> : Icon ? <Icon size={s} aria-hidden="true" /> : null}
      {!iconOnly && children}
      {IconRight && !loading && <IconRight size={s} aria-hidden="true" />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>;
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({ icon: Icon, label, size = 20, to, className = '', small, danger, children, ...rest }) {
  const cls = ['icon-btn', small && 'sm', danger && 'danger', className].filter(Boolean).join(' ');
  if (to) return <Link to={to} className={cls} aria-label={label} title={label} {...rest}><Icon size={size} />{children}</Link>;
  return <button type="button" className={cls} aria-label={label} title={label} {...rest}><Icon size={size} />{children}</button>;
}
