"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import {
  applyStepFlags,
  formatHours,
  formatStudySpan,
  progressFromChunks,
  splitStepHours,
  type StepKind,
} from "@/lib/study-load";
import { todayISO } from "@/lib/dates";
import { saveDayLogAction, setStepDoneAction } from "@/app/actions";
import { logHours, removeLog, upsertLog, type DayStudyItem } from "@/lib/day-log";
import { coreProgress, remainingHours, totalHours, treeProgress, type StudySectionNode, type WeekDayLog } from "@/lib/study-tree";
import { workWeekPace, LATER_CODES, type HoursByDow } from "@/lib/work-week";
import { formatWindow, scheduleTopicWindows, sectionWindow, type TopicWindow } from "@/lib/windows";
import { rememberTopic, TodayDesk } from "@/components/today-desk";
import { StepChecklist } from "@/components/step-checklist";
import { cn } from "@/lib/utils";

type Path = { section?: string; topic?: string; chunk?: string };

function hrefFor(path: Path) {
  const params = new URLSearchParams();
  if (path.section) params.set("section", path.section);
  if (path.topic) params.set("topic", path.topic);
  if (path.chunk) params.set("chunk", path.chunk);
  const q = params.toString();
  return q ? `/?${q}` : "/";
}

function parsePath(search: string): Path {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    section: params.get("section") || undefined,
    topic: params.get("topic") || undefined,
    chunk: params.get("chunk") || undefined,
  };
}

function resolvePath(sections: StudySectionNode[], path: Path): Path {
  if (path.topic && !path.section) {
    for (const section of sections) {
      if (section.topics.some((topic) => topic.id === path.topic)) {
        return { ...path, section: section.code };
      }
    }
  }
  return path;
}

export function StudyApp({
  today,
  sections: initialSections,
  notes: initialNotes,
  log: initialLog,
  hoursByDow,
  week,
  gaDoneOutsideWeek,
  initialPath,
}: {
  today: string;
  sections: StudySectionNode[];
  notes: string;
  log: DayStudyItem[];
  hoursByDow: HoursByDow;
  week: WeekDayLog[];
  gaDoneOutsideWeek: string[];
  initialPath: Path;
}) {
  const [sections, setSections] = useState(initialSections);
  const [path, setPath] = useState<Path>(() => resolvePath(initialSections, initialPath));
  const [notes, setNotes] = useState(initialNotes);
  const [log, setLog] = useState<DayStudyItem[]>(initialLog);
  const [weekDays, setWeekDays] = useState(week);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setWeekDays(week);
  }, [week]);

  useEffect(() => {
    const onPop = () => setPath(parsePath(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (todayISO() !== today) window.location.reload();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [today]);

  function saveDay(date: string, nextNotes: string, nextLog: DayStudyItem[]) {
    const hours = logHours(nextLog);
    setWeekDays((current) =>
      current.map((day) => (day.date === date ? { ...day, notes: nextNotes, log: nextLog, actual: hours } : day)),
    );
    if (date === today) {
      setNotes(nextNotes);
      setLog(nextLog);
    }
    startTransition(() => {
      void saveDayLogAction(nextNotes, hours, nextLog, date);
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveDayLogAction(notes, logHours(log), log, today);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [notes, log, today]);

  function go(next: Path) {
    setPath(next);
    window.history.pushState(null, "", hrefFor(next));
  }

  function setStep(id: string, kind: StepKind, done: boolean) {
    const found = sections.flatMap((section) => section.topics.flatMap((topic) => topic.chunks)).find((chunk) => chunk.id === id);
    const stepHours = found ? splitStepHours(found.hours)[kind] : 0;
    setSections((current) =>
      current.map((section) => ({
        ...section,
        topics: section.topics.map((topic) => ({
          ...topic,
          chunks: topic.chunks.map((chunk) => {
            if (chunk.id !== id) return chunk;
            const next = applyStepFlags(chunk.hours, chunk, kind, done);
            return { ...chunk, ...next };
          }),
        })),
      })),
    );
    setLog((current) =>
      done
        ? upsertLog(current, { chunkId: id, step: kind, status: "done", hours: stepHours })
        : removeLog(current, { chunkId: id, step: kind }),
    );
    startTransition(() => {
      void setStepDoneAction(id, kind, done);
    });
  }

  const remaining = remainingHours(sections);
  const total = totalHours(sections);
  const core = coreProgress(sections);
  const tree = treeProgress(sections);
  const pace = workWeekPace({
    today,
    remainingHours: tree.remaining,
    totalHours: tree.hours,
    loggedHours: logHours(log),
    coreRemaining: core.remaining,
    coreTotal: core.hours,
    hoursByDow,
  });
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

  const section = sections.find((row) => row.code === path.section);
  const topic = section?.topics.find((row) => row.id === path.topic);
  const chunk = topic?.chunks.find((row) => row.id === path.chunk);

  if (chunk && topic && section) {
    const topicWin = windows.byCode.get(topic.code);
    return (
      <ChunkView
        section={section}
        topic={topic}
        chunk={chunk}
        windowLabel={topicWin ? formatWindow(topicWin.start, topicWin.end, topicWin.later) : undefined}
        onBack={() => go({ section: section.code, topic: topic.id })}
        onStep={(kind, done) => setStep(chunk.id, kind, done)}
      />
    );
  }

  if (topic && section) {
    return (
      <TopicView
        section={section}
        topic={topic}
        window={windows.byCode.get(topic.code)}
        onBack={() => go({ section: section.code })}
        onOpen={(id) => {
          rememberTopic({ sectionCode: section.code, topicId: topic.id, topicName: topic.name });
          go({ section: section.code, topic: topic.id, chunk: id });
        }}
      />
    );
  }

  if (section) {
    return (
      <SectionView
        section={section}
        windows={windows.byCode}
        onBack={() => go({})}
        onOpen={(id) => {
          const next = section.topics.find((row) => row.id === id);
          if (next) rememberTopic({ sectionCode: section.code, topicId: next.id, topicName: next.name });
          go({ section: section.code, topic: id });
        }}
      />
    );
  }

  return (
    <TodayDesk
      today={today}
      pace={pace}
      remaining={remaining}
      total={total}
      sections={sections}
      notes={notes}
      log={log}
      week={weekDays}
      hoursByDow={hoursByDow}
      gaDoneOutsideWeek={gaDoneOutsideWeek}
      onNotes={setNotes}
      onLog={setLog}
      onDayLog={(date, nextLog, nextNotes) => saveDay(date, nextNotes, nextLog)}
      onOpenTopic={(sectionCode, topicId) => go({ section: sectionCode, topic: topicId })}
      onStep={setStep}
    />
  );
}

function SectionView({
  section,
  windows,
  onBack,
  onOpen,
}: {
  section: StudySectionNode;
  windows: Map<string, TopicWindow>;
  onBack: () => void;
  onOpen: (topicId: string) => void;
}) {
  const stats = progressFromChunks(section.topics.flatMap((topic) => topic.chunks));
  const win = sectionWindow(
    section.topics.map((topic) => topic.code),
    windows,
  );
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <BackButton label="Today" onClick={onBack} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {section.weightage} · {formatStudySpan(stats.remaining)} left of {formatHours(stats.hours)} ·{" "}
          {formatWindow(win.start, win.end, win.later)}
        </p>
      </header>
      <div className="overflow-hidden rounded-3xl border border-line bg-bg-2">
        {section.topics.map((topic) => {
          const load = progressFromChunks(topic.chunks);
          const later = LATER_CODES.has(topic.code);
          const topicWin = windows.get(topic.code);
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onOpen(topic.id)}
              className="flex min-h-16 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 active:bg-bg"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{topic.name}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {load.percent === 100
                    ? "Completed"
                    : `${formatStudySpan(load.remaining)} · ${formatWindow(topicWin?.start ?? null, topicWin?.end ?? null, later || topicWin?.later)}`}
                </span>
              </span>
              <StatusMark
                done={load.percent === 100}
                label={load.percent === 100 ? "Done" : later ? "Later" : `${load.percent}%`}
              />
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopicView({
  section,
  topic,
  window: topicWindow,
  onBack,
  onOpen,
}: {
  section: StudySectionNode;
  topic: StudySectionNode["topics"][number];
  window?: TopicWindow;
  onBack: () => void;
  onOpen: (chunkId: string) => void;
}) {
  const load = progressFromChunks(topic.chunks);
  const later = LATER_CODES.has(topic.code);
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <BackButton label={section.name} onClick={onBack} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{topic.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {load.percent === 100
            ? "Completed"
            : `${formatStudySpan(load.remaining)} left of ${formatHours(load.hours)} · ${formatWindow(topicWindow?.start ?? null, topicWindow?.end ?? null, later || topicWindow?.later)}`}
        </p>
      </header>
      <div className="overflow-hidden rounded-3xl border border-line bg-bg-2">
        {topic.chunks.map((chunk) => (
          <button
            key={chunk.id}
            type="button"
            onClick={() => onOpen(chunk.id)}
            className="flex min-h-16 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 active:bg-bg"
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border",
                chunk.completed ? "border-good bg-good text-white" : "border-line",
              )}
            >
              {chunk.completed ? <Check className="size-3.5" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", chunk.completed && "text-muted")}>{chunk.name}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {chunk.completed
                  ? "Covered"
                  : `${formatHours(chunk.remaining)} left of ${formatHours(chunk.hours)}`}
              </span>
              <span className="mt-1.5 flex gap-1">
                {[
                  ["L", chunk.lectureDone],
                  ["D", chunk.dppDone],
                  ["T", chunk.testDone],
                ].map(([label, done]) => (
                  <span
                    key={String(label)}
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      done ? "bg-good/15 text-good" : "bg-bg text-muted",
                    )}
                  >
                    {label}
                  </span>
                ))}
              </span>
            </span>
            <StatusMark
              done={chunk.completed}
              label={
                chunk.completed
                  ? "Done"
                  : `${chunk.hours ? Math.round(((chunk.hours - chunk.remaining) / chunk.hours) * 100) : 0}%`
              }
            />
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChunkView({
  section,
  topic,
  chunk,
  windowLabel,
  onBack,
  onStep,
}: {
  section: StudySectionNode;
  topic: StudySectionNode["topics"][number];
  chunk: StudySectionNode["topics"][number]["chunks"][number];
  windowLabel?: string;
  onBack: () => void;
  onStep: (kind: StepKind, done: boolean) => void;
}) {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <BackButton label={topic.name} onClick={onBack} />
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {section.name} · {topic.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{chunk.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {chunk.completed
            ? "Covered. Hours are off the remaining clock."
            : `${formatStudySpan(chunk.remaining)} left of ${formatHours(chunk.hours)}${windowLabel ? ` · topic ${windowLabel}` : ""}`}
        </p>
      </header>
      <section className="rounded-3xl border border-line bg-bg-2 p-5">
        <p className="text-sm leading-relaxed text-muted">
          Tick what you finished. Remaining hours drop immediately and roll up to {topic.name}.
        </p>
        <div className="mt-4">
          <StepChecklist hours={chunk.hours} steps={chunk} onToggle={onStep} />
        </div>
      </section>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 max-w-full items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3.5 text-sm text-muted active:bg-bg"
    >
      <ArrowLeft className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function StatusMark({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
        done ? "bg-good/15 text-good" : "bg-bg text-muted",
      )}
    >
      {label}
    </span>
  );
}
