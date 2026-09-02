import { z } from "zod";

export const SECTORS = [
  { value: "restaurant", label: "Restaurante" },
  { value: "cafe", label: "Cafetería" },
  { value: "hotel", label: "Hotel" },
  { value: "clinic", label: "Clínica" },
  { value: "barbershop", label: "Barbería" },
  { value: "gym", label: "Gimnasio" },
  { value: "agency", label: "Agencia" },
  { value: "retail", label: "Tienda" },
  { value: "other", label: "Otro" },
] as const;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de tu empresa").max(120),
  sector: z.enum(SECTORS.map((s) => s.value) as [string, ...string[]]),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createLocationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de la sucursal").max(120),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
  timezone: z.string().trim().min(1).default("America/Mexico_City"),
  currency: z.string().trim().min(1).default("MXN"),
  googleReviewsUrl: z
    .string()
    .trim()
    .url("Ingresa una URL válida")
    .optional()
    .or(z.literal("")),
  // z.literal("") must come first: z.coerce.number() on an empty string
  // coerces to 0 (Number("") === 0) instead of failing, so checking the
  // literal second would never let an intentionally-blank field through.
  latitude: z.union([z.literal(""), z.coerce.number().min(-90, "Latitud inválida").max(90, "Latitud inválida")]),
  longitude: z.union([z.literal(""), z.coerce.number().min(-180, "Longitud inválida").max(180, "Longitud inválida")]),
  checkinRadiusMeters: z.coerce.number().int().min(20).max(2000).default(150),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
