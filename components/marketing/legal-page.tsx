export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
        <div className="prose-legal mt-10 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </div>
    </section>
  );
}
