import type { ReactNode } from "react";
import Link from "next/link";
import { formatHours, formatStudySpan } from "@/lib/study-load";
import { cn } from "@/lib/utils";

export function SectionCard({
  href,
  name,
  weightage,
  percent,
  days,
  topicCount,
  hours,
  remainingHours,
  finishBy,
}: {
  href: string;
  name: string;
  weightage: string;
  percent: number;
  days: number;
  topicCount: number;
  hours: number;
  remainingHours: number;
  finishBy?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[8.5rem] flex-col justify-between rounded-3xl border border-line bg-bg-2 p-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition active:scale-[0.99] sm:p-5 sm:hover:border-accent/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-semibold leading-snug tracking-tight sm:text-lg">{name}</h2>
          <p className="mt-1 text-sm text-muted">{weightage}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-bg px-3 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums leading-none">{days === 0 ? "✓" : days}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
            {days === 0 ? "done" : "days"}
          </div>
        </div>
      </div>
      <div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {percent}% · {topicCount} topics · {formatHours(remainingHours)} left of {formatHours(hours)}
          {days === 0 ? " · covered" : ` · ${days} study days`}
          {finishBy ? ` · ${finishBy}` : ""}
        </p>
      </div>
    </Link>
  );
}

export function TopicCard({
  name,
  status,
  days,
  percent,
  hoursLabel,
  partsLabel,
  chips,
  children,
}: {
  name: string;
  status: string;
  days: number;
  percent: number;
  hoursLabel?: string;
  partsLabel?: string;
  chips: { key: string; label: string; done: boolean }[];
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-line bg-bg-2 p-4 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[1.05rem] font-semibold leading-snug">{name}</div>
          <div className="mt-1 text-sm text-muted">
            {status}
            {hoursLabel ? ` · ${hoursLabel}` : days === 0 ? " · covered" : ` · ${days} study days left`}
            {partsLabel ? ` · ${partsLabel}` : ""}
          </div>
        </div>
        <span className="tabular-nums text-sm font-medium">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((row) => (
            <span
              key={row.key}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px]",
                row.done ? "bg-good/15 text-good" : "bg-bg text-muted",
              )}
            >
              {row.label}
            </span>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function studyHoursLabel(remaining: number, total: number) {
  return `${formatStudySpan(remaining)} left of ${formatHours(total)}`;
}
