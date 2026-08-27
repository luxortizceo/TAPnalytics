import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Superadmin — TAPnalytics" };

const NAV = [
  { href: "/admin", label: "Organizaciones" },
  { href: "/admin/planes", label: "Planes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin) redirect("/app/dashboard");

  return (
    <div className="min-h-svh">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link href="/admin" className="text-lg font-semibold tracking-tight">
          TAP<span className="text-accent">nalytics</span> <span className="text-muted-foreground">/ superadmin</span>
        </Link>
        <nav className="flex items-center gap-4">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <Link href="/app/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Volver a la app
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
