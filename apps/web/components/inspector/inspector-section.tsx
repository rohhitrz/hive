export function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
