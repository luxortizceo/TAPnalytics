import { getCaseByResolutionToken } from "@/lib/data/resolution-feedback";
import type { ExperienceRating } from "@/lib/supabase/types";
import { ResolutionFeedbackFlow } from "./feedback-flow";

export const metadata = { title: "¿Cómo quedó la solución?" };

const VALID_RATINGS: ExperienceRating[] = ["bad", "good", "excellent"];

export default async function ResolutionFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { token } = await params;
  const { r } = await searchParams;
  const initialRating = VALID_RATINGS.includes(r as ExperienceRating) ? (r as ExperienceRating) : null;
  const caseData = await getCaseByResolutionToken(token);

  if (!caseData) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-lg font-semibold tracking-tight">
          TAP<span className="text-accent">nalytics</span>
        </span>
        <h1 className="mt-4 text-xl font-semibold">Este enlace no está disponible</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Puede que ya no exista o haya expirado. Si crees que esto es un error, contacta al
          establecimiento.
        </p>
      </div>
    );
  }

  if (caseData.alreadyRated) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-lg font-semibold tracking-tight">{caseData.organizationName}</span>
        <h1 className="mt-4 text-xl font-semibold">¡Ya registramos tu respuesta!</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Gracias por tomarte el tiempo de calificar cómo quedó la solución a tu caso {caseData.folio}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ResolutionFeedbackFlow
        token={token}
        organizationName={caseData.organizationName}
        folio={caseData.folio}
        contactFirstName={caseData.contactFirstName}
        initialRating={initialRating}
      />
    </div>
  );
}
