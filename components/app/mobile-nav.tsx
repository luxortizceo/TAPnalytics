"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import type { Membership } from "@/lib/data/current-org";
import { OrgSwitcher, UserMenu } from "@/components/app/header-controls";
import { SidebarNav } from "@/components/app/sidebar-nav";

export function MobileNav({
  current,
  memberships,
}: {
  current: Membership;
  memberships: Membership[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          className="flex size-9 items-center justify-center rounded-md text-foreground hover:bg-surface-2 lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-200 ease-out focus:outline-none data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0"
        >
          <DialogPrimitive.Title className="sr-only">Menú de navegación</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Accede a las secciones de tu cuenta de TAPnalytics.
          </DialogPrimitive.Description>
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link
              href="/app/dashboard"
              onClick={() => setOpen(false)}
              className="text-lg font-semibold tracking-tight"
            >
              TAP<span className="text-accent">nalytics</span>
            </Link>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Cerrar menú"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="border-b border-border p-4">
            <OrgSwitcher current={current} memberships={memberships} />
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <SidebarNav role={current.role} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="border-t border-border p-4">
            <UserMenu role={current.role} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
