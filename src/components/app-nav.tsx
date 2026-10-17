"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/painel", label: "Início" },
  { href: "/painel/agenda", label: "Agenda" },
  { href: "/painel/servicos", label: "Serviços" },
  { href: "/painel/profissionais", label: "Profissionais" },
  { href: "/painel/ia", label: "IA" },
  { href: "/painel/assinatura", label: "Assinatura" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel" className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map((link) => {
        const active = link.href === "/painel" ? pathname === "/painel" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              active ? "border-brand text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
