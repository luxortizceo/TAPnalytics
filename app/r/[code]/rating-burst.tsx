import type { ExperienceRating } from "@/lib/supabase/types";

export const RATING_BURST_DURATION_MS = 900;

const BURST_CONFIG: Record<ExperienceRating, { glow: string; particles: string[] }> = {
  // Sad faces "spit out" of the card in red.
  bad: { glow: "var(--color-racing-red-400)", particles: ["😞", "😢", "😔", "😢", "😞", "😔"] },
  // Warm yellow glow, happy faces.
  good: { glow: "var(--color-amber-400)", particles: ["😄", "😊", "🙂", "😊", "😄", "🙂"] },
  // Green glow, starstruck faces mixed with loose stars.
  excellent: { glow: "var(--color-tech-green-400)", particles: ["🤩", "⭐", "🤩", "⭐", "🤩", "⭐"] },
};

export function RatingBurst({ variant }: { variant: ExperienceRating }) {
  const { glow, particles } = BURST_CONFIG[variant];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        className="absolute size-36 rounded-full blur-2xl"
        style={{
          backgroundColor: glow,
          animation: `rating-burst-glow ${RATING_BURST_DURATION_MS}ms ease-out forwards`,
        }}
      />
      {particles.map((particle, i) => (
        <span
          key={i}
          className="absolute text-3xl"
          style={
            {
              "--burst-angle": `${(360 / particles.length) * i}deg`,
              "--burst-distance": "100px",
              animation: `rating-burst-particle ${RATING_BURST_DURATION_MS}ms ease-out forwards`,
              animationDelay: `${i * 25}ms`,
            } as React.CSSProperties
          }
        >
          {particle}
        </span>
      ))}
    </div>
  );
}
