/** tone: ok | warn | bad | info | violet | brand | gold | outline | '' */
export default function Badge({ tone = '', dot, children, className = '' }) {
  return <span className={['badge', tone, dot && 'dot', className].filter(Boolean).join(' ')}>{children}</span>;
}
