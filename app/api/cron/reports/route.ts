import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardData } from "@/lib/data/dashboard";
import { sendTransactionalEmail, escapeHtml } from "@/lib/email";
import type { ReportFormat, ReportType } from "@/lib/supabase/types";

function isAuthorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Fires scheduled reports whose next_run_at has passed. Meant to be called
 * by an external scheduler (Vercel Cron, GitHub Actions, etc.) — there's no
 * queue or worker of our own in this project, same honest limit as the
 * synchronous alert pipeline in lib/cases.ts. The email body is the
 * executive summary inline (no PDF/Excel attachment yet); it links back to
 * /app/reportes for the formatted, exportable version.
 */

function periodFor(frequency: "daily" | "weekly" | "monthly") {
  const end = new Date();
  const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function nextRunAt(frequency: "daily" | "weekly" | "monthly") {
  const now = new Date();
  const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function summaryHtml(orgName: string, data: Awaited<ReturnType<typeof getDashboardData>>, siteUrl: string) {
  return `
    <h2>Reporte ejecutivo — ${escapeHtml(orgName)}</h2>
    <ul>
      <li>Taps totales: ${data.totalTaps}</li>
      <li>Encuestas completadas: ${data.surveysCompleted}</li>
      <li>Tasa de conversión: ${data.conversionRate}%</li>
      <li>Índice de satisfacción: ${data.satisfactionIndex === null ? "sin datos" : `${data.satisfactionIndex}%`}</li>
      <li>Casos sin resolver: ${data.openCases}</li>
      <li>Alertas activas: ${data.activeAlerts}</li>
    </ul>
    <p><a href="${siteUrl}/app/reportes">Ver el reporte completo, exportar o imprimir</a></p>
  `;
}

// Exported as both GET and POST: Vercel Cron Jobs always invoke the
// configured path with GET (see vercel.json) and there's no way to change
// that, while other schedulers people wire up by hand (GitHub Actions
// `schedule` + curl, cron + curl, etc. — see README.md §4) commonly default
// to POST. Same auth/logic either way.
async function handleCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isAuthorized(request, secret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: dueSchedules } = await admin
    .from("report_schedules")
    .select("*, organizations(name)")
    .eq("is_active", true)
    .lte("next_run_at", new Date().toISOString());

  let sent = 0;
  for (const schedule of (dueSchedules ?? []) as unknown as {
    id: string;
    organization_id: string;
    report_type: ReportType;
    format: ReportFormat;
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
    organizations: { name: string } | null;
  }[]) {
    const { start, end } = periodFor(schedule.frequency);
    const data = await getDashboardData({
      organizationId: schedule.organization_id,
      startDate: start,
      endDate: end,
      client: admin,
    });

    const html = summaryHtml(schedule.organizations?.name ?? "TAPnalytics", data, siteUrl);
    for (const recipient of schedule.recipients) {
      await sendTransactionalEmail({ to: recipient, subject: "Tu reporte ejecutivo de TAPnalytics", html });
    }

    await admin.from("reports").insert({
      organization_id: schedule.organization_id,
      type: schedule.report_type,
      format: schedule.format,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      status: "ready",
    });

    await admin
      .from("report_schedules")
      .update({ next_run_at: nextRunAt(schedule.frequency).toISOString() })
      .eq("id", schedule.id);

    sent++;
  }

  return Response.json({ sent });
}

export const GET = handleCronRequest;
export const POST = handleCronRequest;
