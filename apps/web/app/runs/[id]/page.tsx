import Link from "next/link";

// Placeholder until T7 builds the run view.
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="p-6 text-xs">
      <Link href="/" className="text-muted-foreground hover:text-foreground">
        ← Hive
      </Link>
      <p className="mt-4">
        Run <span className="text-primary">{id}</span> started. The live run view arrives in T7.
      </p>
    </main>
  );
}
