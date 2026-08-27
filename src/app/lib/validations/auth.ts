import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresa tu nombre completo"),
    email: z.string().trim().email("Correo inválido"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, "Debes aceptar los términos y el aviso de privacidad"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
