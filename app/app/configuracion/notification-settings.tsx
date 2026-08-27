"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/primitives";
import { setNotificationPreference } from "./actions";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "new_bad_experience", label: "Nueva experiencia mala" },
  { value: "urgent_comment", label: "Comentario urgente" },
];
const CHANNELS = [
  { value: "email" as const, label: "Correo" },
  { value: "push" as const, label: "Push" },
  { value: "whatsapp" as const, label: "WhatsApp" },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushOptInButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

  if (!publicKey) {
    return <p className="text-xs text-muted-foreground">Notificaciones push no configuradas en este entorno.</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                setStatus("Permiso de notificaciones denegado.");
                return;
              }
              const registration = await navigator.serviceWorker.register("/sw.js");
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
              });
              const res = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
              });
              setStatus(res.ok ? "Notificaciones push activadas en este dispositivo." : "No pudimos activarlas.");
            } catch {
              setStatus("Tu navegador no soporta notificaciones push, o algo falló.");
            }
          })
        }
      >
        {pending ? "Activando…" : "Activar notificaciones push en este dispositivo"}
      </Button>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  );
}

export function NotificationPreferencesGrid({ organizationId }: { organizationId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, boolean>>({});

  function key(category: string, channel: string) {
    return `${category}:${channel}`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-normal">Tipo de alerta</th>
            {CHANNELS.map((c) => (
              <th key={c.value} className="pb-2 text-center font-normal">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <tr key={cat.value} className="border-t border-border">
              <td className="py-2 text-foreground">{cat.label}</td>
              {CHANNELS.map((c) => {
                const k = key(cat.value, c.value);
                const checked = state[k] ?? true;
                return (
                  <td key={c.value} className="py-2 text-center">
                    <Switch
                      checked={checked}
                      disabled={pending}
                      onCheckedChange={(next) => {
                        setState((s) => ({ ...s, [k]: next }));
                        startTransition(() =>
                          void setNotificationPreference(organizationId, cat.value, c.value, next)
                        );
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
