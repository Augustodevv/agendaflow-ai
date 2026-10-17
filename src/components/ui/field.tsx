import type { InputHTMLAttributes } from "react";

export function Field({ label, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        {...rest}
      />
    </div>
  );
}
