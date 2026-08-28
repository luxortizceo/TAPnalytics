"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import type { OrgRole } from "@/lib/supabase/types";

export type InviteState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const inviteSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  role: z.enum(["admin", "manager", "analyst", "employee", "viewer"]),
});

export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "Falta la empresa." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors: { email: fieldErrors.email?.[0] ?? "", role: fieldErrors.role?.[0] ?? "" } };
  }

  // Defense in depth: RLS already blocks the insert below for non
  // owner/admin members, but checking here lets us return a clear message
  // instead of a generic database error.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró." };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  if (!can((membership?.role as OrgRole) ?? null, "manage_users")) {
    return { error: "No tienes permiso para invitar miembros." };
  }

  // Routed through /auth/confirm rather than straight to /onboarding:
  // Supabase's default (non-custom-SMTP) email templates put the session
  // in the URL *fragment* (#access_token=...&type=invite), which only
  // app/auth/confirm's client-side fallback knows how to read and turn
  // into an actual session. It also activates this pending membership and
  // sends the person to set a password before /onboarding ever runs — see
  // app/auth/confirm/actions.ts.
  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/onboarding` }
  );

  if (inviteError || !invited.user) {
    return { error: "No pudimos invitar a ese correo. Verifica que sea válido." };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: invited.user.id,
    role: parsed.data.role,
    status: "invited",
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  });

  if (memberError) {
    return { error: "El usuario ya pertenece a esta empresa o no pudimos agregarlo." };
  }

  revalidatePath("/app/equipo");
  return { success: `Invitación enviada a ${parsed.data.email}.` };
}
