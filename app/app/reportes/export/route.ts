import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// Authenticated CSV export — runs as the signed-in user through the normal
// server client, so RLS (not this route) is what actually scopes the data
// to their organization.
export async function GET(request: NextRequest) {
  const { current } = await getCurrentOrganization();
  if (!current) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const locationId = searchParams.get("locationId");
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const supabase = await createClient();

  let sessionQuery = supabase
    .from("feedback_sessions")
    .select("id, started_at, rating, status, location_id, card_id")
    .eq("organization_id", current.organization.id);
  if (from) sessionQuery = sessionQuery.gte("started_at", from);
  if (to) sessionQuery = sessionQuery.lt("started_at", to);
  if (locationId) sessionQuery = sessionQuery.eq("location_id", locationId);
  const { data: sessions } = await sessionQuery;

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const [{ data: locations }, { data: cards }, { data: responses }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", current.organization.id),
    supabase.from("nfc_cards").select("id, alias").eq("organization_id", current.organization.id),
    sessionIds.length > 0
      ? supabase
          .from("feedback_responses")
          .select("feedback_session_id, answer_text, urgency_level")
          .in("feedback_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const cardById = new Map((cards ?? []).map((c) => [c.id, c.alias]));
  const responseBySession = new Map((responses ?? []).map((r) => [r.feedback_session_id, r]));

  const header = [
    "fecha",
    "sucursal",
    "tarjeta",
    "estado_encuesta",
    "calificacion",
    "urgencia",
    "comentario",
  ];
  const rows = (sessions ?? []).map((s) => {
    const response = responseBySession.get(s.id);
    return [
      s.started_at,
      locationById.get(s.location_id) ?? "",
      cardById.get(s.card_id) ?? "",
      s.status,
      s.rating ?? "",
      response?.urgency_level ?? "",
      response?.answer_text ?? "",
    ];
  });

  const datestamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Encuestas");
    sheet.addRow(header);
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
    sheet.columns.forEach((col) => {
      col.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tapnalytics-reporte-${datestamp}.xlsx"`,
      },
    });
  }

  // "sep=," as the first line forces Excel to use comma as the field
  // separator regardless of the system locale. Without it, Excel on a
  // Spanish-language OS (comma is the decimal separator there) defaults to
  // semicolon, which crams every column into one — making comentario y
  // urgencia look "missing" even though the file has them.
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return new NextResponse(`﻿sep=,\r\n${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tapnalytics-reporte-${datestamp}.csv"`,
    },
  });
}
