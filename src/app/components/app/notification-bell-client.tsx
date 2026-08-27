"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "./notifications-actions";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

export function NotificationBellClient({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-accent" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Sin notificaciones.</p>
        ) : (
          <div className="flex max-h-80 flex-col overflow-y-auto">
            {notifications.map((n) => {
              const href =
                n.related_entity_type === "alert" && n.related_entity_id ? "/app/alertas" : undefined;
              return (
                <DropdownMenuItem
                  key={n.id}
                  asChild
                  onSelect={() => !n.read_at && markNotificationRead(n.id)}
                  className="flex-col items-start gap-0.5 whitespace-normal"
                >
                  {href ? (
                    <Link href={href}>
                      <NotificationBody n={n} />
                    </Link>
                  ) : (
                    <div>
                      <NotificationBody n={n} />
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBody({ n }: { n: NotificationItem }) {
  return (
    <>
      <span className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium text-foreground"}`}>
        {n.title}
      </span>
      {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
      <span className="text-[10px] text-muted-foreground">
        {new Date(n.created_at).toLocaleString("es-MX")}
      </span>
    </>
  );
}
