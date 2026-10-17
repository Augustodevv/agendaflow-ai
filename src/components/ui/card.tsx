import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-border bg-card p-5 shadow-sm shadow-black/[0.03] ${className}`} {...rest} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "brand" | "danger" | "muted"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-foreground/5 text-foreground",
    brand: "bg-brand/10 text-brand",
    danger: "bg-danger/10 text-danger",
    muted: "bg-foreground/5 text-muted",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}
