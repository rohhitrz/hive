"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PRESET, DEPTH_PRESETS, type DepthPreset } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { CreateRunSchema } from "@/lib/validation";

type Errors = Partial<Record<"goal" | "budgetUsd" | "maxAgents" | "maxRounds" | "form", string[]>>;

const GOAL_MAX = 1000;

export function NewRunForm() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [preset, setPreset] = useState<DepthPreset["id"] | "custom">(DEFAULT_PRESET.id);
  const [advanced, setAdvanced] = useState(false);
  const [budget, setBudget] = useState(String(DEFAULT_PRESET.budgetUsd));
  const [agents, setAgents] = useState(String(DEFAULT_PRESET.maxAgents));
  const [rounds, setRounds] = useState(String(DEFAULT_PRESET.maxRounds));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function choosePreset(p: DepthPreset) {
    setPreset(p.id);
    setBudget(String(p.budgetUsd));
    setAgents(String(p.maxAgents));
    setRounds(String(p.maxRounds));
    setErrors((e) => ({ goal: e.goal }));
  }

  function editNumber(field: "budgetUsd" | "maxAgents" | "maxRounds", setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setPreset("custom");
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = CreateRunSchema.safeParse({
      goal,
      mode: "research",
      budgetUsd: budget.trim() === "" ? Number.NaN : Number(budget),
      maxAgents: agents.trim() === "" ? Number.NaN : Number(agents),
      maxRounds: rounds.trim() === "" ? Number.NaN : Number(rounds),
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(fieldErrors);
      if (fieldErrors.budgetUsd || fieldErrors.maxAgents || fieldErrors.maxRounds) setAdvanced(true);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; issues?: { fieldErrors?: Errors } } | null;
      if (!res.ok || !body?.id) {
        setErrors({ ...(body?.issues?.fieldErrors ?? {}), form: [`Could not start the run (HTTP ${res.status}).`] });
        setSubmitting(false);
        return;
      }
      router.push(`/runs/${body.id}`);
    } catch {
      setErrors({ form: ["Network error: could not reach the server."] });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="goal">Research goal</Label>
          <span className={cn("text-[11px] tabular-nums text-muted-foreground", goal.length > GOAL_MAX && "text-red-400")}>
            {goal.length}/{GOAL_MAX}
          </span>
        </div>
        <Textarea
          id="goal"
          rows={4}
          autoFocus
          placeholder="e.g. Should I launch a matcha brand in Germany? Market size, competitors, regulation, margins."
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            if (errors.goal) setErrors((prev) => ({ ...prev, goal: undefined }));
          }}
          aria-invalid={!!errors.goal}
          aria-describedby="goal-error"
        />
        <FieldError id="goal-error" messages={errors.goal} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Depth</Label>
          <div role="radiogroup" aria-label="Depth" className="flex overflow-hidden rounded-md border border-border">
            {DEPTH_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={preset === p.id}
                onClick={() => choosePreset(p)}
                className={cn(
                  "border-r border-border px-3 py-1.5 text-left last:border-r-0 hover:bg-muted",
                  preset === p.id && "bg-primary/15 text-primary",
                )}
              >
                <div className="text-xs font-medium">{p.label}</div>
                <div className="text-[10px] tabular-nums text-muted-foreground">
                  ${p.budgetUsd.toFixed(2)} · {p.maxAgents} agents · {p.maxRounds} {p.maxRounds === 1 ? "round" : "rounds"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mode">Mode</Label>
          <select id="mode" disabled className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" defaultValue="research">
            <option value="research">Research</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
          className="h-8 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {advanced ? "▾" : "▸"} Advanced{preset === "custom" ? " (custom)" : ""}
        </button>
      </div>

      {advanced && (
        <div className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
          <NumberField id="budgetUsd" label="Budget (USD)" step="0.05" min="0.1" max="2" value={budget} onChange={editNumber("budgetUsd", setBudget)} errors={errors.budgetUsd} hint="$0.10 – $2.00" />
          <NumberField id="maxAgents" label="Max agents" step="1" min="1" max="20" value={agents} onChange={editNumber("maxAgents", setAgents)} errors={errors.maxAgents} hint="1 – 20" />
          <NumberField id="maxRounds" label="Max rounds" step="1" min="1" max="5" value={rounds} onChange={editNumber("maxRounds", setRounds)} errors={errors.maxRounds} hint="1 – 5" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Starting…" : "Start run"}
        </Button>
        <FieldError id="form-error" messages={errors.form} />
      </div>
    </form>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  step: string;
  min: string;
  max: string;
  value: string;
  hint: string;
  errors?: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type="number"
        inputMode="decimal"
        step={props.step}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={props.onChange}
        aria-invalid={!!props.errors}
        aria-describedby={`${props.id}-error`}
      />
      {props.errors ? <FieldError id={`${props.id}-error`} messages={props.errors} /> : <p className="text-[10px] text-muted-foreground">{props.hint}</p>}
    </div>
  );
}
