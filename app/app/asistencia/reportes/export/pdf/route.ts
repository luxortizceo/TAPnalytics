import { NextResponse, type NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { getCurrentOrganization } from "@/lib/data/current-org";

export const runtime = "nodejs";
export const maxDuration = 60;

// Mismo enfoque que /app/reportes/export/pdf: renderiza la página real (con
// las cookies de sesión de quien pide el PDF, así que ve los mismos datos
// que vería en pantalla) en un navegador headless y la imprime a PDF real.
export async function GET(request: NextRequest) {
  const { current } = await getCurrentOrganization();
  if (!current) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const targetUrl = new URL("/app/asistencia/reportes", request.nextUrl.origin);
  request.nextUrl.searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: request.nextUrl.origin };
    });

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    if (cookies.length > 0) await page.setCookie(...cookies);
    await page.goto(targetUrl.toString(), { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });

    const datestamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tapnalytics-puntualidad-${datestamp}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
