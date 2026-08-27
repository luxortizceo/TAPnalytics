import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFeedbackCategories, getFeedbackSessionByToken, getSurveyCard } from "@/lib/data/survey";
import { SurveyFlow } from "./survey-flow";

export const metadata = { title: "Cuéntanos tu experiencia" };

export default async function SurveyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const card = await getSurveyCard(code);
  if (!card) redirect("/t/no-disponible");

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(`tap_session_${code}`)?.value;
  if (!sessionToken) redirect(`/t/${code}`);

  // Neither depends on the other's result (both only need `card`) — fetch
  // together instead of paying for it as two sequential round-trips on
  // this route's critical rendering path.
  const [session, categories] = await Promise.all([
    getFeedbackSessionByToken(sessionToken, card.cardId),
    getFeedbackCategories(card.organizationId, card.sector),
  ]);
  if (!session) redirect(`/t/${code}`);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SurveyFlow
        code={code}
        card={card}
        categories={categories}
        initialStatus={session.status}
        initialRating={session.rating}
      />
    </div>
  );
}
