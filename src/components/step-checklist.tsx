"use client";

import { Check } from "lucide-react";
import {
  STEP_HINT,
  STEP_KINDS,
  STEP_LABEL,
  formatHours,
  splitStepHours,
  stepDone,
  type StepFlags,
  type StepKind,
} from "@/lib/study-load";
import { cn } from "@/lib/utils";

export function StepChecklist({
  hours,
  steps,
  onToggle,
  compact,
}: {
  hours: number;
  steps: StepFlags;
  onToggle: (kind: StepKind, done: boolean) => void;
  compact?: boolean;
}) {
  const split = splitStepHours(hours);
  return (
    <div className="grid gap-1.5">
      {STEP_KINDS.map((kind) => {
        const done = stepDone(steps, kind);
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onToggle(kind, !done)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 text-left",
              compact ? "min-h-12 py-2 lg:min-h-11 lg:py-2" : "min-h-16 py-3",
              done ? "border-good/40 bg-good/10" : "border-line bg-bg",
            )}
            aria-pressed={done}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border",
                done ? "border-good bg-good text-white" : "border-line bg-bg-2",
              )}
            >
              {done ? <Check className="size-3.5" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{STEP_LABEL[kind]}</span>
              {compact ? null : <span className="mt-0.5 block text-xs text-muted">{STEP_HINT[kind]}</span>}
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{formatHours(split[kind])}</span>
          </button>
        );
      })}
    </div>
  );
}
