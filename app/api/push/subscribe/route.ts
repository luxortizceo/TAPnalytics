import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { isAllowedPushEndpoint } from "@/lib/notify";

/** Registers/unregisters the current browser's Web Push subscription. */

export async function POST(request: Request) {
  const { current } = await getCurrentOrganization();
  if (!current) return Response.json({ error: "No autorizado." }, { status: 401 });

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return Response.json({ error: "Suscripción inválida." }, { status: 400 });
  }
  if (!isAllowedPushEndpoint(body.endpoint)) {
    return Response.json({ error: "Endpoint de notificaciones no reconocido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado." }, { status: 401 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      organization_id: current.organization.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint" }
  );
  if (error) return Response.json({ error: "No pudimos guardar la suscripción." }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado." }, { status: 401 });

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return Response.json({ error: "Falta el endpoint." }, { status: 400 });

  await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", user.id);
  return Response.json({ ok: true });
}
