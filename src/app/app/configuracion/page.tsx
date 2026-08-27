import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const editable = can(current.role, "edit") && (current.role === "owner" || current.role === "admin");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Datos generales de tu empresa.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Perfil de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm organization={current.organization} editable={editable} />
        </CardContent>
      </Card>
    </div>
  );
}
