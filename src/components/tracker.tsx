"use client";

import { toggleCoverageAction, toggleSubtopicAction } from "@/app/actions";
import type { CoverageKey } from "@/lib/coverage";
import { formatStudySpan } from "@/lib/study-load";
import { cn } from "@/lib/utils";

export function CoveragePills({
  topicId,
  items,
}: {
  topicId: string;
  items: { key: CoverageKey; label: string; done: boolean; total: number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <form key={item.key} action={toggleCoverageAction}>
          <input type="hidden" name="topicId" value={topicId} />
          <input type="hidden" name="key" value={item.key} />
          <button
            type="submit"
            disabled={item.total === 0}
            className={cn(
              "flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-colors",
              item.done
                ? "border-good/40 bg-good/10 text-good"
                : "border-line bg-bg-2 text-ink hover:border-accent/40",
            )}
          >
            <span className="font-medium">{item.label}</span>
            <span className="text-xs">{item.done ? "Done" : "Todo"}</span>
          </button>
        </form>
      ))}
    </div>
  );
}

export function SubtopicRow({
  id,
  name,
  hours,
  completed,
}: {
  id: string;
  name: string;
  hours: number;
  completed: boolean;
}) {
  return (
    <form action={toggleSubtopicAction}>
      <input type="hidden" name="subtopicId" value={id} />
      <button
        type="submit"
        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-bg"
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
            completed ? "border-good bg-good text-white" : "border-line",
          )}
        >
          {completed ? "✓" : ""}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm", completed && "text-muted line-through")}>{name}</span>
          <span className="mt-0.5 block text-xs text-muted">{formatStudySpan(hours)} at 4h/day</span>
        </span>
      </button>
    </form>
  );
}
