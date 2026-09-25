import type { HiveEvent } from "@hive/core";

// Placeholder until T6. Importing a core type proves the workspace wiring typechecks.
const example: HiveEvent["type"] = "plan";

export default function HomePage() {
  return (
    <main className="p-6">
      <h1 className="text-lg font-semibold text-primary">Hive</h1>
      <p className="text-muted-foreground">New run page coming in T6. ({example})</p>
    </main>
  );
}
