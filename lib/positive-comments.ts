import "server-only";

// Shown when a customer rates "excelente" and skips the internal form
// entirely (see app/r/[code]/actions.ts -> completeSession). Since nothing
// was typed, we attach one of these instead of leaving the report's
// comentario column blank for every excellent tap. Keyed by organization
// sector so the tone fits the business.
const POSITIVE_COMMENTS: Record<string, string[]> = {
  restaurant: [
    "Deliciosa la comida, el servicio muy amable.",
    "Todo riquísimo, volveremos pronto.",
    "Excelente sazón y atención rápida.",
    "Muy buena experiencia, se los recomiendo a mis amigos.",
    "El mejor lugar para comer por aquí, sin duda.",
    "Ambiente agradable y comida de calidad.",
    "Nos atendieron increíble, gracias.",
  ],
  cafe: [
    "El mejor café de la zona, volveré seguido.",
    "Rapidísimo y delicioso, felicidades al equipo.",
    "Ambiente muy acogedor, me encantó.",
    "Excelente atención, se los recomiendo.",
    "Rico café y buen trato, todo perfecto.",
    "Mi nuevo lugar favorito para trabajar.",
  ],
  hotel: [
    "Excelente estadía, el personal muy atento.",
    "Habitación impecable y muy buen servicio.",
    "Nos sentimos como en casa, gracias por todo.",
    "Muy buena atención desde el check-in.",
    "Todo estuvo perfecto, volveremos pronto.",
    "El personal siempre dispuesto a ayudar, excelente.",
  ],
  clinic: [
    "Excelente atención médica, muy profesionales.",
    "Me sentí muy bien atendido, gracias.",
    "Rápido, limpio y muy buen trato.",
    "El personal muy amable y explicaron todo bien.",
    "Muy buena experiencia, se los recomiendo.",
    "Atención puntual y de calidad.",
  ],
  barbershop: [
    "Excelente corte, quedé encantado.",
    "Muy buen servicio y ambiente agradable.",
    "El barbero es un artista, súper recomendado.",
    "Rápido, limpio y buena atención.",
    "Siempre salgo satisfecho de aquí.",
    "El mejor corte que me han hecho en años.",
  ],
  gym: [
    "Excelente ambiente, el equipo siempre limpio.",
    "Los entrenadores muy atentos y profesionales.",
    "Me encanta entrenar aquí, buen ambiente.",
    "Instalaciones muy bien cuidadas.",
    "El personal siempre dispuesto a ayudar.",
    "Muy buena experiencia, se nota el compromiso del equipo.",
  ],
  agency: [
    "Excelente asesoría, resolvieron todas mis dudas.",
    "Muy profesionales y atentos en todo momento.",
    "Quedé muy satisfecho con el servicio.",
    "Rápida respuesta y buen trato.",
    "Se los recomiendo, muy buen equipo de trabajo.",
    "Todo el proceso fue muy claro y sencillo.",
  ],
  retail: [
    "Excelente atención, encontré todo lo que buscaba.",
    "Muy buen servicio y variedad de productos.",
    "El personal muy amable y atento.",
    "Rápido y sin complicaciones, todo bien.",
    "Buena calidad y buen precio, volveré.",
    "Me atendieron muy bien, gracias.",
  ],
  other: [
    "Excelente atención, todo muy bien.",
    "Muy buen servicio, se los recomiendo.",
    "Quedé muy satisfecho con la experiencia.",
    "Todo perfecto, gracias por la atención.",
    "Buen trato y buena calidad.",
    "Volveré sin duda, excelente experiencia.",
  ],
};

export function pickRandomPositiveComment(sector: string): string {
  const list = POSITIVE_COMMENTS[sector] ?? POSITIVE_COMMENTS.other;
  return list[Math.floor(Math.random() * list.length)];
}
