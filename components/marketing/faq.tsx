import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "¿TAPnalytics elimina o bloquea reseñas negativas?",
    a: "No. TAPnalytics nunca oculta, bloquea ni impide que un cliente deje una reseña pública. El enlace a Google Reviews se muestra siempre, sin importar si la experiencia fue mala, buena o excelente.",
  },
  {
    q: "¿Necesito una app para usar las tarjetas NFC?",
    a: "No. El cliente solo acerca su teléfono a la tarjeta; se abre una página web ligera en su navegador. No requiere instalar nada.",
  },
  {
    q: "¿Cómo protegen los datos de mis clientes?",
    a: "Aplicamos Row Level Security a nivel de base de datos para aislar cada empresa, anonimizamos direcciones IP y solo solicitamos datos de contacto cuando el cliente decide proporcionarlos voluntariamente.",
  },
  {
    q: "¿Puedo tener varias sucursales bajo una sola cuenta?",
    a: "Sí. Una cuenta empresarial puede tener una o varias marcas y sucursales, cada una con su propia configuración, tarjetas y comparativa de resultados.",
  },
  {
    q: "¿Qué pasa si cancelo mi suscripción?",
    a: "Puedes cancelar cuando quieras. Tus datos permanecen disponibles durante el periodo de gracia definido en tu plan antes de cualquier eliminación.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
