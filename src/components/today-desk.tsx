"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { daysForHours, formatHours, formatStudySpan, progressFromChunks, STEP_LABEL, type StepKind } from "@/lib/study-load";
import { formatLongDate } from "@/lib/dates";
import {
  GA_DRIP_HOURS,
  GA_DRIP_ID,
  logHours,
  logKey,
  removeLog,
  upsertLog,
  type DayStudyItem,
} from "@/lib/day-log";
import {
  searchChunks,
  suggestedNext,
  unfinishedPrereqs,
  type StudySectionNode,
  type StudyWorkItem,
  type WeekDayLog,
} from "@/lib/study-tree";
import { hourChips, LATER_CODES, type HoursByDow, workWeekPace } from "@/lib/work-week";
import { formatWindow, scheduleTopicWindows, sectionWindow } from "@/lib/windows";
import { StepChecklist } from "@/components/step-checklist";
import { cn } from "@/lib/utils";

const LAST_KEY = "gate-last-topic";
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type LastTopic = { sectionCode: string; topicId: string; topicName: string };

export function rememberTopic(last: LastTopic) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(last));
  } catch {
    /* ignore */
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function coachLine(
  pace: ReturnType<typeof workWeekPace>,
  todayHours: number,
  lockedDays: number,
) {
  if (todayHours >= pace.todayTarget && pace.todayTarget > 0) {
    return lockedDays > 1
      ? `Day locked. ${lockedDays} days on the board this week.`
      : "That's a full day. Same slot tomorrow.";
  }
  if (todayHours > 0) {
    return `${formatHours(todayHours)} in. ${formatHours(pace.todayLeft)} more and this day counts.`;
  }
  if (pace.isWeekend && pace.delayHours > 0) {
    return `Weekend catch-up: ${formatHours(pace.delayHours)}. One heavy subject, then PYQs. Stop by 19:00.`;
  }
  if (pace.isWeekend) return "Weekend: one heavy subject, then PYQs. Stop by 19:00.";
  return "Tick Lecture, then DPP, then one EduRev test. GA 25 min sits inside the 4h.";
}

export function TodayDesk({
  today,
  pace,
  remaining,
  total,
  sections,
  notes,
  log,
  week,
  hoursByDow,
  onNotes,
  onLog,
  onOpenSection,
  onOpenTopic,
  onStep,
}: {
  today: string;
  pace: ReturnType<typeof workWeekPace>;
  remaining: number;
  total: number;
  sections: StudySectionNode[];
  notes: string;
  log: DayStudyItem[];
  week: WeekDayLog[];
  hoursByDow: HoursByDow;
  onNotes: (value: string) => void;
  onLog: (next: DayStudyItem[]) => void;
  onOpenSection: (code: string) => void;
  onOpenTopic: (sectionCode: string, topicId: string) => void;
  onStep: (chunkId: string, kind: StepKind, done: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<StudyWorkItem | null>(null);
  const [status, setStatus] = useState<"done" | "started">("done");
  const [hours, setHours] = useState(1);
  const [last, setLast] = useState<LastTopic | null>(null);
  const [hello, setHello] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      if (raw) setLast(JSON.parse(raw) as LastTopic);
    } catch {
      /* ignore */
    }
    setHello(greeting());
  }, []);

  const hits = useMemo(() => searchChunks(sections, query), [sections, query]);
  const catalog = useMemo(() => flattenIndex(sections), [sections]);
  const next = useMemo(() => suggestedNext(sections), [sections]);
  const windows = useMemo(
    () =>
      scheduleTopicWindows({
        today,
        hoursByDow,
        topics: sections.flatMap((section) =>
          section.topics.map((topic) => ({
            code: topic.code,
            remainingHours: progressFromChunks(topic.chunks).remaining,
          })),
        ),
      }),
    [hoursByDow, sections, today],
  );
  const chips = hourChips(pace.todayTarget);
  const todayHours = logHours(log);
  const lockedDays = week.filter((day) => day.actual >= day.target && day.target > 0).length;
  const dayPct = pace.todayTarget <= 0 ? 0 : Math.min(100, Math.round((todayHours / pace.todayTarget) * 100));
  const dayDone = todayHours >= pace.todayTarget && pace.todayTarget > 0;
  const current = next?.chunk;
  const topicWin = next ? windows.byCode.get(next.topicCode) : undefined;
  const gaLogged = log.some((row) => row.chunkId === GA_DRIP_ID);

  function choose(item: StudyWorkItem) {
    setPicked(item);
    setStatus(item.completed ? "started" : "done");
    setHours(item.completed ? 1 : Math.min(item.remaining || item.hours, pace.todayTarget || 4));
    setQuery("");
  }

  function addPicked() {
    if (!picked) return;
    onLog(upsertLog(log, { chunkId: picked.id, status, hours: Math.max(0.5, hours) }));
    if (status === "done") {
      onStep(picked.id, "lecture", true);
      onStep(picked.id, "dpp", true);
      onStep(picked.id, "test", true);
    }
    rememberTopic({ sectionCode: picked.sectionCode, topicId: picked.topicId, topicName: picked.topicName });
    setLast({ sectionCode: picked.sectionCode, topicId: picked.topicId, topicName: picked.topicName });
    setPicked(null);
  }

  const prereqs = picked ? unfinishedPrereqs(sections, picked.topicCode) : [];

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <header className="grid gap-3">
        {hello ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            {hello} · {formatLongDate(today)}
          </p>
        ) : (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{formatLongDate(today)}</p>
        )}
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
          {dayDone ? "You showed up today." : current ? current.name : "Core first pass is clear."}
        </h1>

        <section className="rounded-3xl border border-line bg-bg-2 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">
                {pace.isWeekend ? "Weekend target" : "Office-day target"}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {formatHours(todayHours)}
                <span className="text-lg font-medium text-muted"> / {formatHours(pace.todayTarget)}</span>
              </p>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
              {dayDone ? "Locked" : `${dayPct}%`}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent-soft">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${dayPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{coachLine(pace, todayHours, lockedDays)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-muted">
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-ink">{lockedDays}/7 days</span>
            <span className="rounded-full bg-bg px-2.5 py-1">{pace.daysLeft}d to 31 Dec</span>
            {pace.delayHours > 0 ? (
              <span className="rounded-full bg-bg px-2.5 py-1">Catch up {formatHours(pace.delayHours)}</span>
            ) : (
              <span className="rounded-full bg-bg px-2.5 py-1">On the week</span>
            )}
          </div>
        </section>

        <WeekStrip week={week} />
        <p className="text-sm leading-relaxed text-muted">
          Core {formatHours(pace.coreDone)} / {formatHours(pace.coreTotal)}. High-yield first; later subjects wait.
          {!pace.coreFits
            ? ` Calendar left ${formatHours(pace.capacityLeft)}.`
            : ` ${formatHours(remaining)} of ${formatHours(total)} still in the full tree.`}
        </p>
      </header>

      {current && next ? (
        <section className="rounded-3xl border border-line bg-bg-2 p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">This chunk</p>
          <h2 className="mt-1 text-lg font-semibold">{next.topicName}</h2>
          <p className="mt-1 text-sm text-muted">
            {formatStudySpan(next.remaining)} left
            {topicWin
              ? ` · finish by ${formatWindow(topicWin.start, topicWin.end, topicWin.later)}`
              : ""}
            {" · "}
            {daysForHours(current.remaining)} study day{daysForHours(current.remaining) === 1 ? "" : "s"} on this chunk
          </p>
          <p className="mt-3 text-sm font-medium">{current.name}</p>
          <div className="mt-3">
            <StepChecklist
              hours={current.hours}
              steps={current}
              onToggle={(kind, done) => {
                onStep(current.id, kind, done);
                rememberTopic({ sectionCode: next.sectionCode, topicId: next.topicId, topicName: next.topicName });
                setLast({ sectionCode: next.sectionCode, topicId: next.topicId, topicName: next.topicName });
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onOpenTopic(next.sectionCode, next.topicId)}
            className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl border border-line bg-bg text-sm font-medium active:bg-accent-soft"
          >
            Open full topic
          </button>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onLog(
            gaLogged
              ? removeLog(log, { chunkId: GA_DRIP_ID, step: "ga" })
              : upsertLog(log, { chunkId: GA_DRIP_ID, step: "ga", status: "done", hours: GA_DRIP_HOURS }),
          )
        }
        className={cn(
          "flex min-h-16 items-center justify-between rounded-3xl border px-4 py-3 text-left active:scale-[0.99]",
          gaLogged ? "border-good/40 bg-good/10" : "border-line bg-bg-2",
        )}
      >
        <span>
          <span className="block text-sm font-medium">GA drip</span>
          <span className="text-xs text-muted">25 min Quant or Verbal test. Inside the 4h.</span>
        </span>
        <span className="text-xs font-medium text-muted">{gaLogged ? "Logged" : "25 min"}</span>
      </button>

      <section className="rounded-3xl border border-line bg-bg-2 p-4 shadow-[0_1px_2px_rgba(15,31,28,0.04)] sm:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            placeholder="Log something else — pointers, K-map, SQL…"
            className="min-h-12 w-full rounded-2xl border border-line bg-bg py-3 pl-11 pr-3 text-base outline-none ring-accent/15 focus:ring-4"
          />
        </label>
        {last ? (
          <button
            type="button"
            onClick={() => onOpenTopic(last.sectionCode, last.topicId)}
            className="mt-3 flex min-h-12 items-center text-sm font-medium text-accent"
          >
            Continue {last.topicName}
          </button>
        ) : null}

        {hits.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            {hits.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item)}
                className="flex min-h-14 w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 active:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted">
                    {item.sectionName} · {item.topicName} · {formatHours(item.remaining)} left
                    {item.completed ? " · already done" : ""}
                    {LATER_CODES.has(item.topicCode) ? " · later" : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        ) : null}

        {picked ? (
          <div className="mt-4 rounded-2xl bg-bg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{picked.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {picked.sectionName} · {picked.topicName}
                </p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="grid size-11 place-items-center text-muted">
                <X className="size-4" />
              </button>
            </div>
            {prereqs.length > 0 ? (
              <p className="mt-3 text-sm text-warn">
                You have not finished {prereqs.map((row) => row.name).join(", ")} yet. Log anyway if that is what you
                studied.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("done")}
                className={cn(
                  "min-h-12 rounded-xl text-sm font-medium",
                  status === "done" ? "bg-accent text-white" : "border border-line bg-bg-2",
                )}
              >
                Finished it
              </button>
              <button
                type="button"
                onClick={() => setStatus("started")}
                className={cn(
                  "min-h-12 rounded-xl text-sm font-medium",
                  status === "started" ? "bg-accent text-white" : "border border-line bg-bg-2",
                )}
              >
                Started, not finished
              </button>
            </div>
            <p className="mt-3 text-sm">Hours on this</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setHours(chip)}
                  className={cn(
                    className="min-h-12 min-w-14 rounded-xl px-3 text-sm font-medium"
                    hours === chip ? "bg-accent text-white" : "border border-line bg-bg-2",
                  )}
                >
                  {formatHours(chip)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={addPicked}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent text-sm font-medium text-white"
            >
              Add to today
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-line bg-bg-2 p-4 sm:p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">You studied</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing yet. Tick a step above, or search a topic.</p>
        ) : (
          <div className="mt-2 divide-y divide-line">
            {log.map((row) => {
              const item = catalog.get(row.chunkId);
              const stepName = row.step && row.step !== "ga" ? STEP_LABEL[row.step] : null;
              const title =
                row.chunkId === GA_DRIP_ID || row.step === "ga"
                  ? "GA drip"
                  : stepName
                    ? `${stepName} · ${item?.name ?? "Chunk"}`
                    : (item?.name ?? "Chunk");
              const detail =
                row.chunkId === GA_DRIP_ID || row.step === "ga"
                  ? `${formatHours(row.hours)} · finished`
                  : `${item ? `${item.topicName} · ` : ""}${formatHours(row.hours)}${row.status === "done" ? " · finished" : " · started"}`;
              return (
                <div key={logKey(row)} className="flex min-h-14 items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="text-xs text-muted">{detail}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onLog(removeLog(log, row))}
                    className="min-h-12 shrink-0 px-3 text-sm text-muted"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <label className="mt-4 grid gap-1 text-sm">
          Note
          <textarea
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            rows={3}
            className="rounded-2xl border border-line bg-bg px-3 py-2"
            placeholder="What was hard, what to repeat tomorrow"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-line bg-bg-2 p-2 sm:p-3">
        <h2 className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Browse syllabus</h2>
        <div className="mt-1">
          {sections.map((section) => {
            const stats = progressFromChunks(section.topics.flatMap((topic) => topic.chunks));
            const later = section.topics.length > 0 && section.topics.every((topic) => LATER_CODES.has(topic.code));
            const win = sectionWindow(
              section.topics.map((topic) => topic.code),
              windows.byCode,
            );
            return (
              <button
                key={section.code}
                type="button"
                onClick={() => onOpenSection(section.code)}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{section.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        stats.percent === 100 ? "bg-good/15 text-good" : "text-muted",
                      )}
                    >
                      {stats.percent === 100 ? "Done" : later ? "Later" : `${stats.percent}%`}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {stats.percent === 100
                      ? "Covered"
                      : `${formatHours(stats.remaining)} left · ${formatWindow(win.start, win.end, later || win.later)}`}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span
                      className={cn("block h-full rounded-full", stats.percent === 100 ? "bg-good" : "bg-accent")}
                      style={{ width: `${stats.percent}%` }}
                    />
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WeekStrip({ week }: { week: WeekDayLog[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {week.map((day, i) => {
        const hit = day.actual >= day.target && day.target > 0;
        const fill = day.target <= 0 ? 0 : Math.min(100, Math.round((day.actual / day.target) * 100));
        return (
          <div
            key={day.date}
            className={cn(
              "rounded-2xl border border-line bg-bg-2 px-1 py-2 text-center",
              day.isToday && "border-accent bg-accent/5",
            )}
            title={`${day.date}: ${formatHours(day.actual)} / ${formatHours(day.target)}`}
          >
            <span className={cn("text-[10px] font-semibold", day.isToday ? "text-accent" : "text-muted")}>
              {DAY_LETTERS[i]}
            </span>
            <span className="mx-auto mt-1.5 flex h-8 w-1.5 flex-col justify-end overflow-hidden rounded-full bg-line">
              <span
                className={cn("w-full rounded-full", hit ? "bg-good" : fill > 0 ? "bg-accent" : "bg-transparent")}
                style={{ height: `${fill}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function flattenIndex(sections: StudySectionNode[]) {
  const map = new Map<string, StudyWorkItem>();
  for (const section of sections) {
    for (const topic of section.topics) {
      for (const chunk of topic.chunks) {
        map.set(chunk.id, {
          ...chunk,
          sectionCode: section.code,
          sectionName: section.name,
          topicId: topic.id,
          topicName: topic.name,
          topicCode: topic.code,
        });
      }
    }
  }
  return map;
}
