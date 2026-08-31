import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * Optional AI layer for TAP Intelligence. Degrades gracefully (returns
 * null, never throws) when AI_API_KEY isn't configured — the rule-based
 * engine in lib/intelligence.ts works completely fine without this, this
 * only adds sentiment analysis over free-text comments on top of it. Same
 * "unconfigured is not an error" pattern as lib/email.ts / lib/notify.ts.
 */

const apiKey = process.env.AI_API_KEY;
const model = process.env.AI_MODEL || "claude-opus-5";
const client = apiKey ? new Anthropic({ apiKey }) : null;

// TEMP DEBUG — never logs the value itself, only whether it's set and how
// long it is. Remove once we confirm AI_API_KEY is read correctly in prod.
console.log(
  "[ai] AI_API_KEY diagnostic:",
  apiKey ? `set, length ${apiKey.length}, prefix ${apiKey.slice(0, 12)}` : "NOT SET"
);

const SentimentResultSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().describe("El número de línea del comentario, empezando en 0"),
      sentiment: z.enum(["positive", "negative", "neutral"]),
      summary: z.string().describe("Resumen del comentario en español, máximo 8 palabras"),
    })
  ),
});

export type SentimentResult = {
  index: number;
  sentiment: "positive" | "negative" | "neutral";
  summary: string;
};

/**
 * Analiza el sentimiento de una lista de comentarios de clientes en un solo
 * request (más barato y rápido que uno por comentario). Devuelve null si la
 * IA no está configurada o si la llamada falla — nunca lanza una excepción,
 * para que TAP Intelligence pueda seguir funcionando por reglas sin esto.
 */
export async function analyzeSentiment(texts: string[]): Promise<SentimentResult[] | null> {
  if (!client || texts.length === 0) return null;

  const numbered = texts.map((text, index) => `${index}. ${text}`).join("\n");

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 4096,
      output_config: {
        effort: "low",
        format: zodOutputFormat(SentimentResultSchema),
      },
      messages: [
        {
          role: "user",
          content:
            "Analiza el sentimiento de estos comentarios de clientes de un negocio local " +
            "(cada línea empieza con su número). Para cada uno, clasifica su sentimiento " +
            "como positive, negative o neutral, y da un resumen breve en español.\n\n" +
            numbered,
        },
      ],
    });
    return response.parsed_output?.results ?? null;
  } catch (error) {
    console.error("[ai] analyzeSentiment failed", error);
    return null;
  }
}

const CaseSuggestionSchema = z.object({
  diagnosis: z.string().describe("Diagnóstico breve de qué salió mal para este cliente, en español, máximo 2 frases"),
  customerResponse: z
    .string()
    .describe(
      "Mensaje breve sugerido para responder o hablar directamente con este cliente, en español, tono empático y profesional, listo para usarse casi tal cual"
    ),
  internalAction: z
    .string()
    .describe(
      "Acción interna concreta que el negocio debería tomar para resolver o prevenir este problema específico, en español"
    ),
});

export type CaseSuggestion = {
  diagnosis: string;
  customerResponse: string;
  internalAction: string;
};

/**
 * Da una sugerencia de cómo manejar un caso (reporte negativo) puntual: qué
 * pasó, qué decirle al cliente y qué hacer internamente. Devuelve null si la
 * IA no está configurada o si la llamada falla — nunca lanza, para que la
 * creación del caso nunca dependa de esto.
 */
export async function suggestCaseResolution(input: {
  comments: string[];
  categories: string[];
  urgency: string;
  rating: string;
}): Promise<CaseSuggestion | null> {
  if (!client) return null;

  const commentsText = input.comments.filter((c) => c.trim().length > 0).join("\n---\n") || "(sin comentario de texto)";

  try {
    const response = await client.messages.parse({
      model,
      max_tokens: 1024,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(CaseSuggestionSchema),
      },
      messages: [
        {
          role: "user",
          content:
            `Un cliente dejó esta retroalimentación negativa en un negocio local ` +
            `(calificación: ${input.rating}, urgencia asignada: ${input.urgency}).\n` +
            `Categorías del problema marcadas: ${input.categories.join(", ") || "ninguna"}.\n` +
            `Comentario(s) del cliente:\n${commentsText}\n\n` +
            "Ayuda al dueño o encargado del negocio a resolver este caso puntual de la mejor " +
            "manera posible, con un mensaje que pueda usar para responderle al cliente y una " +
            "acción interna concreta.",
        },
      ],
    });
    return response.parsed_output ?? null;
  } catch (error) {
    console.error("[ai] suggestCaseResolution failed", error);
    return null;
  }
}
