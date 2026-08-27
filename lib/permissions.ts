import type { OrgRole } from "@/lib/supabase/types";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "manage_users"
  | "manage_cards"
  | "manage_billing"
  | "view_sensitive";

// Coarse role → allowed-actions matrix. Row-level enforcement of the same
// rules lives in supabase/migrations/0004_rls_policies.sql — this table
// exists to drive the UI (hide/disable controls a user can't use) and must
// never be the only gate on a mutating request; the database RLS policies
// are the actual security boundary.
const MATRIX: Record<OrgRole, Action[]> = {
  superadmin: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "manage_users",
    "manage_cards",
    "manage_billing",
    "view_sensitive",
  ],
  owner: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "manage_users",
    "manage_cards",
    "manage_billing",
    "view_sensitive",
  ],
  admin: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "manage_users",
    "manage_cards",
    "view_sensitive",
  ],
  manager: ["view", "create", "edit", "export", "manage_cards", "view_sensitive"],
  analyst: ["view", "export", "view_sensitive"],
  employee: ["view", "create"],
  viewer: ["view"],
};

export function can(role: OrgRole | null | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}
