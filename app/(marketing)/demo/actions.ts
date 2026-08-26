"use server";

import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/email";
import { zodFieldErrors } from "@/lib/validations/zod-helpers";

const demoRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa tu nombre"),
  company: z.string().trim().min(2, "Ingresa el nombre de tu empresa"),
  email: z.string().trim().email("Correo inválido"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type DemoRequestState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

export async function requestDemo(
  _prev: DemoRequestState,
  formData: FormData
): Promise<DemoRequestState> {
  const parsed = demoRequestSchema.safeParse({
    fullName: formData.get("fullName"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const salesInbox = process.env.SALES_INBOX_EMAIL;
  if (salesInbox) {
    await sendTransactionalEmail({
      to: salesInbox,
      subject: `Nueva solicitud de demostración — ${parsed.data.company}`,
      html: `
        <p><strong>Nombre:</strong> ${parsed.data.fullName}</p>
        <p><strong>Empresa:</strong> ${parsed.data.company}</p>
        <p><strong>Correo:</strong> ${parsed.data.email}</p>
        <p><strong>Teléfono:</strong> ${parsed.data.phone || "—"}</p>
        <p><strong>Mensaje:</strong> ${parsed.data.message || "—"}</p>
      `,
    });
  }

  return {
    success: "Gracias. Un miembro de nuestro equipo te contactará en menos de 24 horas hábiles.",
  };
}
