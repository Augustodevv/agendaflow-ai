import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm transition focus:border-brand disabled:opacity-60";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string };

export function Field({ label, id, hint, className = "", ...rest }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} name={rest.name ?? id} className={inputClass} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string };

export function Select({ label, id, className = "", children, ...rest }: SelectProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} name={rest.name ?? id} className={inputClass} {...rest}>
        {children}
      </select>
    </div>
  );
}
