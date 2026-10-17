import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const styles =
    variant === "primary"
      ? "bg-brand text-brand-foreground hover:opacity-90"
      : "border border-border hover:bg-card";
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:opacity-60 ${styles} ${className}`}
      {...rest}
    />
  );
}
