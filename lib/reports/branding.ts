import "server-only";
import type ExcelJS from "exceljs";
import type { OrganizationRow } from "@/lib/supabase/types";

const EXT_BY_CONTENT_TYPE: Record<string, "png" | "jpeg" | "gif"> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/gif": "gif",
};

/**
 * Pone el logo y el nombre del cliente arriba de la hoja, en vez de que
 * cada Excel se vea genérico. Si logo_url falla (URL rota, host caído,
 * etc.) simplemente no se agrega la imagen — nunca debe tronar el export
 * completo por un logo que no cargó.
 *
 * Devuelve la fila en la que debe empezar la tabla real (deja espacio para
 * el banner de marca arriba).
 */
export async function addBrandHeader(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  organization: Pick<OrganizationRow, "name" | "logo_url" | "brand_color">,
  reportTitle: string
): Promise<number> {
  let textCol = "A";

  if (organization.logo_url) {
    try {
      const res = await fetch(organization.logo_url, { signal: AbortSignal.timeout(4000) });
      const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
      const extension = EXT_BY_CONTENT_TYPE[contentType];
      if (res.ok && extension) {
        const buffer = await res.arrayBuffer();
        const imageId = workbook.addImage({ buffer, extension });
        sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 44 } });
        textCol = "D";
      }
    } catch {
      // logo no disponible — seguimos sin él, no es motivo para fallar el export
    }
  }

  sheet.getCell(`${textCol}1`).value = organization.name;
  sheet.getCell(`${textCol}1`).font = { bold: true, size: 14 };
  sheet.getCell(`${textCol}2`).value = reportTitle;
  sheet.getCell(`${textCol}2`).font = { size: 11, color: { argb: "FF888888" } };

  return 5; // primera fila libre para la tabla de datos
}

export function brandFill(brandColor: string | null | undefined): ExcelJS.Fill | undefined {
  if (!brandColor || !/^#[0-9a-fA-F]{6}$/.test(brandColor)) return undefined;
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandColor.slice(1).toUpperCase()}` } };
}
