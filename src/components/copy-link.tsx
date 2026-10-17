"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const full = url;
  return (
    <div className="mt-3 flex gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-10 min-w-0 flex-1 items-center truncate rounded-lg border border-border px-3 text-sm text-brand">
        {full.replace(/^https?:\/\//, "")}
      </a>
      <Button
        type="button"
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <span aria-live="polite">{copied ? "Copiado!" : "Copiar"}</span>
      </Button>
    </div>
  );
}
