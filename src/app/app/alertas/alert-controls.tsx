"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { AlertStatus, AlertType } from "@/lib/supabase/types";
import { setAlertStatus, toggleAlertRule } from "./actions";

export function AlertRuleSwitch({
  organizationId,
  type,
  name,
  active,
}: {
  organizationId: string;
  type: AlertType;
  name: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(() => void toggleAlertRule(organizationId, type, name, checked))
      }
    />
  );
}

export function AlertRowActions({ alertId, status }: { alertId: string; status: AlertStatus }) {
  const [pending, startTransition] = useTransition();

  if (status === "resolved") {
    return <span className="text-xs text-muted-foreground">Resuelta</span>;
  }

  return (
    <div className="flex justify-end gap-2">
      {status === "active" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => void setAlertStatus(alertId, "acknowledged"))}
        >
          Reconocer
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => void setAlertStatus(alertId, "resolved"))}
      >
        Resolver
      </Button>
    </div>
  );
}
