import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { CARD_STATUS_LABELS, CONTACT_POINT_TYPES } from "@/lib/nfc";
import type { CardStatus, LocationRow, NfcCardRow } from "@/lib/supabase/types";
import { CardDialog } from "./card-dialog";
import { LinkDialog } from "./link-dialog";

export const metadata = { title: "Tarjetas NFC" };

interface CardRow extends NfcCardRow {
  location: { name: string } | null;
}

export default async function CardsPage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();

  const [{ data: locations }, { data: cardsData }] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", current.organization.id)
      .order("name", { ascending: true }),
    // See the cast note in src/lib/data/current-org.ts — embedded resource
    // selects can't be typed against this hand-authored Database.
    supabase
      .from("nfc_cards")
      .select("*, location:locations(name)")
      .eq("organization_id", current.organization.id)
      .order("created_at", { ascending: true }) as unknown as Promise<{ data: CardRow[] | null }>,
  ]);

  const cards = cardsData ?? [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const qrByCard = new Map<string, string>();
  for (const card of cards) {
    const url = `${siteUrl}/t/${card.public_code}`;
    qrByCard.set(card.id, await QRCode.toDataURL(url, { margin: 1, width: 240 }));
  }

  const contactPointLabel = (value: string) =>
    CONTACT_POINT_TYPES.find((t) => t.value === value)?.label ?? value;

  const canManage = can(current.role, "manage_cards");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarjetas NFC</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las tarjetas de {current.organization.name}. La landing pública y el
            registro de taps se activan al probar el enlace.
          </p>
        </div>
        {canManage &&
          (locations && locations.length > 0 ? (
            <CardDialog organizationId={current.organization.id} locations={locations as LocationRow[]} />
          ) : (
            <p className="text-sm text-muted-foreground">Crea una sucursal primero.</p>
          ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Aún no tienes tarjetas NFC registradas.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Alias</th>
                <th className="px-4 py-3 font-medium">Sucursal</th>
                <th className="px-4 py-3 font-medium">Punto de contacto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Taps totales</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cards.map((card) => (
                <tr key={card.id} className="bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {card.alias || "—"}
                    {card.area_label && (
                      <span className="ml-1.5 text-xs text-muted-foreground">({card.area_label})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{card.location?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {contactPointLabel(card.contact_point_type)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={card.status === "active" ? "positive" : "outline"}>
                      {CARD_STATUS_LABELS[card.status as CardStatus]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{card.total_taps}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <LinkDialog
                        alias={card.alias ?? ""}
                        url={`${siteUrl}/t/${card.public_code}`}
                        qrDataUrl={qrByCard.get(card.id) ?? ""}
                      />
                      {canManage && (
                        <CardDialog
                          organizationId={current.organization.id}
                          locations={(locations as LocationRow[]) ?? []}
                          card={card}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
