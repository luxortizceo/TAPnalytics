import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/primitives";
import { INSIGHT_TYPE_LABELS } from "@/lib/labels";
import type {
  AiInsightRow,
  CorrectiveActionRow,
  InsightType,
  RecommendationRow,
} from "@/lib/supabase/types";
import {
  RefreshInsightsButton,
  RecommendationStatusSelect,
  CorrectiveActionStatusSelect,
  CorrectiveActionForm,
} from "./intelligence-ui";

export const metadata = { title: "TAP Intelligence" };

const NEGATIVE_TYPES: InsightType[] = ["anomaly", "recurring_issue"];

export default async function IntelligencePage() {
  const { current } = await getCurrentOrganization();
  if (!current) return null;

  const supabase = await createClient();
  const organizationId = current.organization.id;

  const [{ data: insights }, { data: recommendations }] = await Promise.all([
    supabase
      .from("ai_insights")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20) as unknown as Promise<{ data: AiInsightRow[] | null }>,
    supabase
      .from("recommendations")
      .select("*, corrective_actions(*)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(30) as unknown as Promise<{
      data: (RecommendationRow & { corrective_actions: CorrectiveActionRow[] })[] | null;
    }>,
  ]);

  const recommendationByInsight = new Map((recommendations ?? []).map((r) => [r.ai_insight_id, r]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TAP Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anomalías, problemas recurrentes y comparativas detectadas en los últimos 30 días,
            con la evidencia que las respalda.
          </p>
        </div>
        <RefreshInsightsButton />
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Motor basado en reglas y comparación de periodos — no un modelo de lenguaje externo.
          La <strong className="text-foreground">confianza</strong> es un valor entre 0 y 1 calculado a
          partir del tamaño de la muestra, no una probabilidad estadística real; siempre se muestra
          junto al periodo y la muestra que la originaron para que puedas juzgarla tú mismo.
        </CardContent>
      </Card>

      {!insights || insights.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin hallazgos todavía. Da clic en &quot;Analizar ahora&quot; para procesar los últimos 30 días
            de retroalimentación.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {insights.map((insight) => {
            const recommendation = recommendationByInsight.get(insight.id);
            return (
              <Card key={insight.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={NEGATIVE_TYPES.includes(insight.type) ? "outline" : "positive"}>
                        {INSIGHT_TYPE_LABELS[insight.type]}
                      </Badge>
                      {insight.confidence !== null && (
                        <span className="text-xs text-muted-foreground">
                          confianza {Math.round(insight.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-2">{insight.title}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {insight.period_start} → {insight.period_end} · muestra {insight.sample_size ?? "—"}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-foreground">{insight.description}</p>

                  {recommendation && (
                    <div className="rounded-md border border-border bg-surface-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">Recomendación</p>
                        <RecommendationStatusSelect id={recommendation.id} value={recommendation.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
                      {recommendation.suggested_action && (
                        <p className="mt-1 text-sm text-foreground">
                          Acción sugerida: {recommendation.suggested_action}
                        </p>
                      )}

                      {recommendation.corrective_actions.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                          {recommendation.corrective_actions.map((ca) => (
                            <li
                              key={ca.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"
                            >
                              <div>
                                <p className="text-sm text-foreground">{ca.title}</p>
                                {ca.due_date && (
                                  <p className="text-xs text-muted-foreground">Vence: {ca.due_date}</p>
                                )}
                              </div>
                              <CorrectiveActionStatusSelect id={ca.id} value={ca.status} />
                            </li>
                          ))}
                        </ul>
                      )}

                      <CorrectiveActionForm recommendationId={recommendation.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
