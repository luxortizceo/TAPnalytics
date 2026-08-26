"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LinkDialog({
  alias,
  url,
  qrDataUrl,
}: {
  alias: string;
  url: string;
  qrDataUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the URL is
      // still visible and selectable in the dialog.
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Link2 className="size-4" />
          Enlace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alias || "Tarjeta NFC"}</DialogTitle>
          <DialogDescription>
            URL única para programar la tarjeta física, o su código QR equivalente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`Código QR de ${url}`}
            width={200}
            height={200}
            className="rounded-md border border-border bg-white p-2"
          />
          <div className="flex w-full items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2 text-xs">
              {url}
            </code>
            <Button type="button" variant="secondary" size="icon" onClick={handleCopy} aria-label="Copiar enlace">
              {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
