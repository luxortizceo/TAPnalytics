export const metadata = { title: "Enlace no disponible" };

export default function CardUnavailablePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-lg font-semibold tracking-tight">
        TAP<span className="text-accent">nalytics</span>
      </span>
      <h1 className="mt-4 text-xl font-semibold">Este enlace no está disponible</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        La tarjeta no está activa en este momento. Si crees que esto es un error, contacta al
        establecimiento.
      </p>
    </div>
  );
}
