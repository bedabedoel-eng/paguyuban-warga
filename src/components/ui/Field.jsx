import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';

export function Field({ label, error, hint, optional, children, className = '', htmlFor }) {
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={htmlFor}>{label}{optional && <span className="optional"> (opsional)</span>}</label>}
      {children}
      {error ? <span className="error" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, optional, className = '', fieldClass, icon: Icon, ...rest }, ref) {
  const id = useId();
  const input = <input id={id} ref={ref} className={`input ${Icon ? 'has-lead' : ''} ${error ? 'invalid' : ''} ${className}`} aria-invalid={!!error} {...rest} />;
  return (
    <Field label={label} error={error} hint={hint} optional={optional} htmlFor={id} className={fieldClass}>
      {Icon ? <div className="input-wrap"><Icon size={18} className="lead-icon" aria-hidden="true" />{input}</div> : input}
    </Field>
  );
});

export const SearchInput = forwardRef(function SearchInput({ value, onChange, placeholder = "Cari…", label = "Cari", className = "", ...rest }, ref) {
  return (
    <div className={`input-wrap search-field ${className}`}>
      <Search size={18} className="lead-icon" aria-hidden="true" />
      <input ref={ref} className="input has-lead has-trail" type="search" placeholder={placeholder} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {value && <button type="button" className="icon-btn sm trail-btn" onClick={() => onChange('')} aria-label="Hapus pencarian"><X size={16} /></button>}
    </div>
  );
});

export function PasswordInput({ label, error, hint, fieldClass, ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <div className="input-wrap">
        <input id={id} type={show ? 'text' : 'password'} className={`input has-trail ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest} />
        <button type="button" className="icon-btn sm trail-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan PIN' : 'Tampilkan PIN'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

/** PIN 6 angka: hanya angka, papan ketik numerik di HP. */
export function PinInput({ onChange, ...rest }) {
  return (
    <PasswordInput
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      {...rest}
      onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange?.(e);
      }}
    />
  );
}

export function PhoneInput({ label, error, hint, fieldClass, ...rest }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={fieldClass}>
      <div className="input-wrap">
        <span className="addon">+62</span>
        <input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" className={`input ${error ? 'invalid' : ''}`} aria-invalid={!!error} {...rest} />
      </div>
    </Field>
  );
}

export function Select({ label, error, hint, optional, options = [], placeholder, className = '', fieldClass, ...rest }) {
  const id = useId();
  const el = (
    <select id={id} className={`select ${error ? 'invalid' : ''} ${className}`} aria-invalid={!!error} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>))}
    </select>
  );
  if (!label && !error && !hint) return el;
  return <Field label={label} error={error} hint={hint} optional={optional} htmlFor={id} className={fieldClass}>{el}</Field>;
}

export function Textarea({ label, error, hint, optional, fieldClass, maxLength, value, ...rest }) {
  const id = useId();
  const n = (value || '').length;
  const counter = maxLength && n > maxLength * 0.6 ? `${n}/${maxLength}` : null;
  return (
    <Field label={label} error={error} hint={hint || counter} optional={optional} htmlFor={id} className={fieldClass}>
      <textarea id={id} className={`textarea ${error ? 'invalid' : ''}`} maxLength={maxLength} value={value} aria-invalid={!!error} {...rest} />
    </Field>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span aria-hidden="true" />
    </label>
  );
}

export function Checkbox({ checked, onChange, children, hint, disabled }) {
  return (
    <label className="check">
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span>{children}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

/** Pilihan berbentuk kartu (pengganti radio). */
export function ChoiceGroup({ value, onChange, options, label }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button type="button" key={o.value} role="radio" aria-checked={value === o.value} aria-pressed={value === o.value} className="choice" onClick={() => onChange(o.value)}>
            {Icon && <Icon size={18} aria-hidden="true" />}<span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
