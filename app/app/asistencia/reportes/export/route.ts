import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/current-org";
import { addBrandHeader, brandFill } from "@/lib/reports/branding";
import { can } from "@/lib/permissions";

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// Authenticated CSV/XLSX export — corre como el usuario logueado a través
// del server client normal, así que RLS (no esta ruta) es lo que en
// realidad limita los datos a su organización.
export async function GET(request: NextRequest) {
  const { current } = await getCurrentOrganization();
  if (!current || !can(current.role, "export")) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const locationId = searchParams.get("locationId");
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const supabase = await createClient();

  let recordQuery = supabase
    .from("attendance_records")
    .select("id, team_member_id, location_id, checked_in_at, checked_out_at, status, minutes_late")
    .eq("organization_id", current.organization.id)
    .order("checked_in_at", { ascending: false });
  if (from) recordQuery = recordQuery.gte("checked_in_at", from);
  if (to) recordQuery = recordQuery.lt("checked_in_at", to);
  if (locationId) recordQuery = recordQuery.eq("location_id", locationId);

  const [{ data: records }, { data: members }, { data: locations }] = await Promise.all([
    recordQuery,
    supabase.from("team_members").select("id, name").eq("organization_id", current.organization.id),
    supabase.from("locations").select("id, name").eq("organization_id", current.organization.id),
  ]);

  const memberById = new Map((members ?? []).map((m) => [m.id, m.name]));
  const locationById = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const header = ["fecha_entrada", "persona", "sucursal", "hora_entrada", "hora_salida", "estado", "minutos_tarde"];
  const rows = (records ?? []).map((r) => [
    r.checked_in_at.slice(0, 10),
    memberById.get(r.team_member_id) ?? "",
    locationById.get(r.location_id) ?? "",
    new Date(r.checked_in_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    r.checked_out_at ? new Date(r.checked_out_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "",
    r.status === "late" ? "Tarde" : "A tiempo",
    r.status === "late" ? r.minutes_late : 0,
  ]);

  const datestamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Puntualidad");
    const headerRowIndex = await addBrandHeader(workbook, sheet, current.organization, "Reporte de puntualidad");

    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = header;
    headerRow.font = { bold: true };
    const fill = brandFill(current.organization.brand_color);
    if (fill) headerRow.fill = fill;

    rows.forEach((row, i) => {
      sheet.getRow(headerRowIndex + 1 + i).values = row;
    });
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tapnalytics-puntualidad-${datestamp}.xlsx"`,
      },
    });
  }

  // "sep=," fuerza a Excel a usar coma como separador sin importar el
  // locale del sistema — mismo motivo que en el export de /app/reportes.
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return new NextResponse(`﻿sep=,\r\n${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tapnalytics-puntualidad-${datestamp}.csv"`,
    },
  });
}
