import { Badge, Separator } from "@/components/ui/primitives";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { CASE_STATUS_LABELS, URGENCY_LABELS } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusSelect, UrgencySelect, AssignSelect, NotesForm, GenerateSuggestionButton } from "./case-detail-client";
import type { OrgRole } from "@/lib/supabase/types";

export const metadata = { title: "Detalle del caso" };

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();

  const { data: caseRow } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
  if (!caseRow) notFound();

  // See the cast note in src/lib/data/current-org.ts — embedded resource
  // selects can't be typed against this hand-authored Database.
  interface MemberRow {
    user_id: string;
    role: OrgRole;
    profile: { full_name: string | null } | null;
  }
  interface NoteRow {
    id: string;
    note: string;
    created_at: string;
    author: { full_name: string | null } | null;
  }
  interface HistoryRow {
    id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }

  const [{ data: location }, { data: members }, { data: notes }, { data: history }] = (await Promise.all([
    supabase.from("locations").select("name").eq("id", caseRow.location_id).single(),
    supabase
      .from("organization_members")
      .select("user_id, role, profile:profiles(full_name)")
      .eq("organization_id", current.organization.id)
      .in("role", ["owner", "admin", "manager", "analyst"])
      .eq("status", "active"),
    supabase
      .from("case_notes")
      .select("id, note, created_at, author:profiles(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("case_history")
      .select("id, field, old_value, new_value, created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ])) as unknown as [
    { data: { name: string } | null },
    { data: MemberRow[] | null },
    { data: NoteRow[] | null },
    { data: HistoryRow[] | null },
  ];

  let responses: { question_key: string; answer_text: string | null; categories: string[] }[] = [];
  if (caseRow.feedback_session_id) {
    const { data: feedbackResponses } = (await supabase
      .from("feedback_responses")
      .select("id, question_key, answer_text, response_categories(feedback_categories(label))")
      .eq("feedback_session_id", caseRow.feedback_session_id)) as unknown as {
      data:
        | {
            question_key: string;
            answer_text: string | null;
            response_categories: { feedback_categories: { label: string } | null }[];
          }[]
        | null;
    };

    responses = (feedbackResponses ?? []).map((r) => ({
      question_key: r.question_key,
      answer_text: r.answer_text,
      categories: (r.response_categories ?? [])
        .map((rc) => rc.feedback_categories?.label)
        .filter((v): v is string => !!v),
    }));
  }

  const canManage = can(current.role, "edit");
  const canViewSensitive = can(current.role, "view_sensitive");

  const memberOptions = (members ?? []).map((m) => ({
    userId: m.user_id,
    label: `${m.profile?.full_name || "Sin nombre"} (${ROLE_LABELS[m.role]})`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app/casos" className="text-xs text-muted-foreground underline underline-offset-2">
          ← Todos los casos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight">{caseRow.folio}</h1>
          <Badge variant="outline">{location?.name}</Badge>
          {caseRow.rating && <Badge variant="outline">Calificación: {caseRow.rating}</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Creado el {new Date(caseRow.created_at).toLocaleString("es-MX")}
          {caseRow.due_at && ` · Vence el ${new Date(caseRow.due_at).toLocaleString("es-MX")}`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Retroalimentación original</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {caseRow.summary && <p className="text-sm text-foreground">{caseRow.summary}</p>}
              {responses.map((r, i) => (
                <div key={i} className="flex flex-col gap-1.5 border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <p className="text-sm text-foreground">{r.answer_text || "Sin comentario."}</p>
                  {r.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.categories.map((label) => (
                        <Badge key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {canViewSensitive && (caseRow.contact_name || caseRow.contact_email || caseRow.contact_phone) && (
                <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Datos de contacto (con consentimiento)</p>
                  {caseRow.contact_name && <p>{caseRow.contact_name}</p>}
                  {caseRow.contact_email && <p>{caseRow.contact_email}</p>}
                  {caseRow.contact_phone && <p>{caseRow.contact_phone}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sugerencia de TAP Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {caseRow.ai_suggestion ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Diagnóstico</p>
                    <p className="mt-1 text-sm text-foreground">{caseRow.ai_suggestion.diagnosis}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Mensaje sugerido para el cliente</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {caseRow.ai_suggestion.customerResponse}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Acción interna recomendada</p>
                    <p className="mt-1 text-sm text-foreground">{caseRow.ai_suggestion.internalAction}</p>
                  </div>
                  {caseRow.ai_suggestion.escalation && (
                    <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
                      <p className="text-xs font-medium text-accent">Cuándo y cómo escalar</p>
                      <p className="mt-1 text-sm text-foreground">{caseRow.ai_suggestion.escalation}</p>
                    </div>
                  )}
                  {caseRow.ai_suggestion.doNot && caseRow.ai_suggestion.doNot.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Para desescalar — qué NO hacer
                      </p>
                      <ul className="mt-1 flex flex-col gap-1 text-sm text-foreground">
                        {caseRow.ai_suggestion.doNot.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {caseRow.ai_suggestion.source === "ai"
                      ? "Generado por IA"
                      : caseRow.ai_suggestion.source === "incident"
                        ? "Del catálogo de incidentes por giro de negocio"
                        : "De la base de soluciones pre-escritas"}
                    {caseRow.ai_suggestion_generated_at &&
                      ` el ${new Date(caseRow.ai_suggestion_generated_at).toLocaleString("es-MX")}`}
                    . Revísalo antes de usarlo — tú conoces al cliente mejor que esta sugerencia.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no hay sugerencia para este caso (puede tardar unos segundos en generarse tras crearse, o
                  ninguna de sus categorías tiene una entrada en la base de soluciones todavía).
                </p>
              )}
              {canManage && <GenerateSuggestionButton caseId={id} hasSuggestion={!!caseRow.ai_suggestion} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {canManage && <NotesForm caseId={id} />}
              <div className="flex flex-col gap-3">
                {(notes ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aún no hay notas.</p>
                )}
                {(notes ?? []).map((n) => (
                  <div key={n.id} className="rounded-md border border-border bg-surface p-3">
                    <p className="text-sm text-foreground">{n.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.author?.full_name || "Alguien"} ·{" "}
                      {new Date(n.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(history ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Sin cambios registrados aún.</p>
              )}
              {(history ?? []).map((h) => (
                <div key={h.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{h.field}</span>: {h.old_value ?? "—"} →{" "}
                  {h.new_value ?? "—"} · {new Date(h.created_at).toLocaleString("es-MX")}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Estado</span>
                {canManage ? (
                  <StatusSelect caseId={id} value={caseRow.status} />
                ) : (
                  <Badge variant="outline">{CASE_STATUS_LABELS[caseRow.status]}</Badge>
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Prioridad</span>
                {canManage ? (
                  <UrgencySelect caseId={id} value={caseRow.urgency} />
                ) : (
                  <Badge variant="outline">{URGENCY_LABELS[caseRow.urgency]}</Badge>
                )}
              </div>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Responsable</span>
                {canManage ? (
                  <AssignSelect caseId={id} value={caseRow.assigned_to} members={memberOptions} />
                ) : (
                  <span className="text-sm text-foreground">
                    {memberOptions.find((m) => m.userId === caseRow.assigned_to)?.label ?? "Sin asignar"}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tiempos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
              <p>
                Primera respuesta:{" "}
                {caseRow.first_response_at ? new Date(caseRow.first_response_at).toLocaleString("es-MX") : "Pendiente"}
              </p>
              <p>
                Resuelto:{" "}
                {caseRow.resolved_at ? new Date(caseRow.resolved_at).toLocaleString("es-MX") : "Pendiente"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
