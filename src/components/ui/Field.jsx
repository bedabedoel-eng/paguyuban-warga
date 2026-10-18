import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Field({ label, error, hint, children, className = '', htmlFor }) {
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, className = '', fieldClass, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <input id={id} ref={ref} className={`input ${error ? 'invalid' : ''} ${className}`} aria-invalid={!!error} {...rest} />
    </Field>
  );
});

export function PasswordInput({ label, error, hint, fieldClass, inputMode = 'numeric', pattern = '[0-9]*', ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <div className="input-group">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          inputMode={inputMode}
          pattern={pattern}
          className={`input ${error ? 'invalid' : ''}`}
          style={{ paddingRight: 42 }}
          aria-invalid={!!error}
          {...rest}
        />
        <button type="button" className="suffix-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan PIN' : 'Tampilkan PIN'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

export function PhoneInput({ label, error, hint, fieldClass, ...rest }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <div className="input-group">
        <span className="addon">+62</span>
        <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" className={`input ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest} />
      </div>
    </Field>
  );
}

export function Select({ label, error, hint, options = [], placeholder, className = '', fieldClass, ...rest }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <select id={id} className={`select ${error ? 'invalid' : ''} ${className}`} aria-invalid={!!error} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, fieldClass, maxLength, value, ...rest }) {
  const id = useId();
  const counter = maxLength ? `${(value || '').length}/${maxLength}` : null;
  return (
    <Field label={label} error={error} hint={hint || counter} htmlFor={id} className={fieldClass}>
      <textarea id={id} className={`textarea ${error ? 'invalid' : ''}`} maxLength={maxLength} value={value} aria-invalid={!!error} {...rest} />
    </Field>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="toggle" aria-label={label}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span />
    </label>
  );
}
