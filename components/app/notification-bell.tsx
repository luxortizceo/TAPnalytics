import { createClient } from "@/lib/supabase/server";
import { NotificationBellClient } from "./notification-bell-client";

export async function NotificationBell({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at, related_entity_type, related_entity_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(15);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return <NotificationBellClient notifications={notifications ?? []} unreadCount={unreadCount} />;
}
