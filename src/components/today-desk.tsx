"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { daysForHours, formatHours, formatStudySpan, progressFromChunks, START_DATE, STEP_LABEL, type StepKind } from "@/lib/study-load";
import { addDaysISO, formatLongDate, formatShortDate } from "@/lib/dates";
import { GA_DRIP_HOURS, logHours, logKey, removeLog, upsertLog, type DayStudyItem } from "@/lib/day-log";
import {
  collectGaDone,
  gaAreaStats,
  gaChapterComplete,
  gaLogTitle,
  gaStepsFromLog,
  gaWorkHint,
  isWeekend,
  namedGaFrom,
  nextGaChapter,
  planGaWeek,
  toggleGaStep,
  type GaChapter,
  type GaDaySlot,
} from "@/lib/ga-plan";
import {
  searchChunks,
  suggestedNext,
  unfinishedPrereqs,
  type StudySectionNode,
  type StudyWorkItem,
  type WeekDayLog,
} from "@/lib/study-tree";
import { catalogSplit, DRIP_CODES, hourChips, isCoreTopic, LATER_CODES, weekCarry, type HoursByDow, workWeekPace } from "@/lib/work-week";
import { formatWindow, scheduleTopicWindows, sectionWindow, type TopicWindow } from "@/lib/windows";
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
  gaDoneOutsideWeek,
  onNotes,
  onLog,
  onDayLog,
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
  gaDoneOutsideWeek: string[];
  onNotes: (value: string) => void;
  onLog: (next: DayStudyItem[]) => void;
  onDayLog: (date: string, nextLog: DayStudyItem[], nextNotes: string) => void;
  onOpenTopic: (sectionCode: string, topicId: string) => void;
  onStep: (chunkId: string, kind: StepKind, done: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<StudyWorkItem | null>(null);
  const [status, setStatus] = useState<"done" | "started">("done");
  const [hours, setHours] = useState(1);
  const [last, setLast] = useState<LastTopic | null>(null);
  const [hello, setHello] = useState("");
  const [pickedDay, setPickedDay] = useState(today);
  const [showWeek, setShowWeek] = useState(true);

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
  const liveWeek = useMemo(() => {
    const days = week.map((day) => (day.date === today ? { ...day, actual: todayHours, log, notes } : day));
    const carry = weekCarry(days, START_DATE);
    return days.map((day, i) => ({ ...day, ...carry[i] }));
  }, [log, notes, today, todayHours, week]);
  const selected = liveWeek.find((day) => day.date === pickedDay) ?? liveWeek.find((day) => day.isToday) ?? liveWeek[0];
  const lockedDays = liveWeek.filter((day) => day.actual >= day.target && day.target > 0).length;
  const current = next?.chunk;
  const topicWin = next ? windows.byCode.get(next.topicCode) : undefined;
  const gaDone = useMemo(() => {
    const fromWeek = collectGaDone(liveWeek.map((day) => (day.date === today ? log : day.log)));
    return new Set([...gaDoneOutsideWeek, ...fromWeek]);
  }, [gaDoneOutsideWeek, liveWeek, log, today]);
  const gaToday = namedGaFrom(log) ?? nextGaChapter(gaDone);
  const gaLogged = Boolean(gaToday && gaChapterComplete(log, gaToday.id));
  const gaSlots = useMemo(
    () =>
      planGaWeek({
        weekDates: liveWeek.map((day) => day.date),
        today,
        done: gaDone,
        logsByDate: new Map(liveWeek.map((day) => [day.date, day.date === today ? log : day.log])),
        todayComplete: gaLogged,
      }),
    [gaDone, gaLogged, liveWeek, log, today],
  );
  const gaStats = gaAreaStats(gaDone);
  const gaByDate = useMemo(() => {
    const map = new Map<string, GaChapter>();
    for (const slot of gaSlots) {
      if (slot.chapter) map.set(slot.date, slot.chapter);
    }
    return map;
  }, [gaSlots]);

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
  const allTopics = useMemo(() => sections.flatMap((section) => section.topics), [sections]);
  const coveredAll = allTopics.filter((topic) => topicCover(topic).done).length;
  const corePct = pace.coreTotal <= 0 ? 0 : Math.round((pace.coreDone / pace.coreTotal) * 100);
  const treePct = pace.treeTotal <= 0 ? 0 : Math.round((pace.treeDone / pace.treeTotal) * 100);
  const topicPct = allTopics.length === 0 ? 0 : Math.round((coveredAll / allTopics.length) * 100);
  const finish = pace.projectedFinish ? formatShortDate(pace.projectedFinish) : null;
  const coreFinish = pace.coreProjectedFinish ? formatShortDate(pace.coreProjectedFinish) : null;
  const split = catalogSplit();

  return (
    <div className="mx-auto grid max-w-5xl gap-2.5 lg:gap-3">
      <p className="px-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {hello || "Today"} · {formatLongDate(today)}
      </p>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi value={formatHours(todayHours)} label={`${pace.isWeekend ? "Weekend" : "Office"} today / ${formatHours(pace.todayTarget)}`} />
        <Kpi value={formatHours(pace.treeRemaining)} label={`Full tree left of ${formatHours(pace.treeTotal)}`} />
        <Kpi value={`${coveredAll}/${allTopics.length}`} label="Topics covered · all" />
        <Kpi value={`${pace.daysToExam}d`} label="To exam 7 Feb" />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <Banner
          title="Reality check"
          value={
            pace.treeFits
              ? `Full tree fits · ${finish ?? "on time"}`
              : `Full tree lands ${finish ?? "—"}`
          }
          detail={
            pace.treeFits
              ? `${formatHours(pace.capacityToExam)} on the calendar to 7 Feb covers ${formatHours(pace.treeRemaining)} left.`
              : `${formatHours(pace.treeRemaining)} left · only ${formatHours(pace.capacityToExam)} to 7 Feb at 36h/week. ${pace.treeSlipDays}d past the exam if nothing is cut.`
          }
          tone={pace.treeFits ? undefined : "warn"}
        />
        <Banner
          title="Core vs 31 Dec"
          value={coreFinish ? `Core ${coreFinish}` : "Core covered"}
          detail={
            pace.coreFits
              ? `${formatHours(pace.coreRemaining)} core left · ${formatHours(pace.capacityLeft)} to 31 Dec.`
              : `${formatHours(pace.coreRemaining)} core left · ${formatHours(pace.capacityLeft)} to 31 Dec · ${pace.slipDays}d past that line.`
          }
          tone={pace.coreFits ? undefined : "warn"}
        />
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2 lg:items-stretch">
      {current && next ? (
        <section className="rounded-2xl border border-line bg-bg-2 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Now</p>
              <h1 className="mt-0.5 text-base font-semibold leading-snug">{current.name}</h1>
              <p className="mt-0.5 text-[11px] text-muted">
                {next.topicName} · {formatStudySpan(next.remaining)}
                {topicWin ? ` · ${formatWindow(topicWin.start, topicWin.end, topicWin.later)}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent">
              {daysForHours(current.remaining)}d
            </span>
          </div>
          <div className="mt-3">
            <StepChecklist
              compact
              hours={current.hours}
              steps={current}
              onToggle={(kind, done) => {
                onStep(current.id, kind, done);
                rememberTopic({ sectionCode: next.sectionCode, topicId: next.topicId, topicName: next.topicName });
                setLast({ sectionCode: next.sectionCode, topicId: next.topicId, topicName: next.topicName });
              }}
            />
          </div>
        </section>
      ) : null}

      {gaToday ? (
        <section className="rounded-2xl border border-line bg-bg-2 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                GA today · {gaToday.area}
              </p>
              <h2 className="mt-0.5 text-base font-semibold leading-snug">{gaToday.name}</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                {today < START_DATE
                  ? `From Monday 7 Sep · ${gaWorkHint(gaToday)} · 25 min inside the 4h`
                  : `${gaWorkHint(gaToday)} · 25 min inside the ${isWeekend(today) ? "8h" : "4h"}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent">
              {today < START_DATE ? "Mon 7 Sep" : "25 min"}
            </span>
          </div>
          <div className="mt-3">
            <StepChecklist
              compact
              hours={GA_DRIP_HOURS}
              steps={gaStepsFromLog(log, gaToday.id)}
              onToggle={(kind, done) => onLog(toggleGaStep(log, gaToday, kind, done))}
            />
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-line bg-bg-2 px-3.5 py-2.5">
          <p className="text-sm font-medium">GA roster complete</p>
          <p className="text-[11px] text-muted">Revisit EduRev PYQ or a practice test. Still 25 min inside the day.</p>
        </div>
      )}
      </div>

      {showWeek ? (
        <div className="grid gap-2.5 lg:grid-cols-2 lg:items-stretch">
          <section className="rounded-2xl border border-line bg-bg-2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">This week</h2>
              <div className="flex items-center gap-2">
                <p className="text-[11px] tabular-nums text-muted">{lockedDays}/7 locked</p>
                <button type="button" onClick={() => setShowWeek(false)} className="min-h-9 px-2 text-[11px] font-medium text-accent">
                  Hide
                </button>
              </div>
            </div>
            <p className="mb-2 text-[11px] text-muted">Hours vs day target · tap a day</p>
            <WeekStrip week={liveWeek} selected={selected?.date ?? today} onSelect={setPickedDay} />
          </section>
          {selected ? (
            <DayPanel
              day={selected}
              today={today}
              catalog={catalog}
              notes={notes}
              todayLog={log}
              gaChapter={gaByDate.get(selected.date) ?? null}
              onNotes={onNotes}
              onLog={onLog}
              onDayLog={onDayLog}
            />
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowWeek(true)}
          className="min-h-11 px-0.5 text-left text-[11px] font-medium text-accent"
        >
          Show this week
        </button>
      )}

      <div className="grid gap-2.5 lg:grid-cols-2 lg:items-start">
      <section className="rounded-2xl border border-line bg-bg-2 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Hours on this plan</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Tick Lecture / DPP / Test to cover. GA is 25 min inside the day, not extra hours.
        </p>
        <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
        <MixRow
          label="Full tree (core + later)"
          value={`${formatHours(pace.treeDone)} / ${formatHours(pace.treeTotal)}`}
          pct={treePct}
        />
        <MixRow label="Core · C to CN" value={`${formatHours(pace.coreDone)} / ${formatHours(split.core)}`} pct={corePct} />
        <MixRow
          label="Later · DL, COA, TOC, CD, LA, Calc"
          value={`${formatHours(Math.max(0, pace.treeDone - pace.coreDone))} / ${formatHours(split.later)}`}
          pct={split.later <= 0 ? 0 : Math.round((Math.max(0, pace.treeDone - pace.coreDone) / split.later) * 100)}
        />
        <MixRow
          label="GA · EduRev daily"
          value={`${gaStats.done} / ${gaStats.total} chapters`}
          pct={gaStats.total <= 0 ? 0 : Math.round((gaStats.done / gaStats.total) * 100)}
        />
        <MixRow label="Topics covered" value={`${coveredAll} / ${allTopics.length}`} pct={topicPct} />
        <MixRow
          label="Calendar to exam"
          value={formatHours(pace.capacityToExam)}
          pct={
            pace.treeRemaining <= 0
              ? 100
              : Math.min(100, Math.round((pace.capacityToExam / Math.max(pace.treeRemaining, 0.1)) * 100))
          }
        />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-bg-2 p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            placeholder="Log something else"
            className="min-h-12 w-full rounded-xl border border-line bg-bg py-3 pl-10 pr-3 text-base outline-none"
          />
        </label>
        {last ? (
          <button
            type="button"
            onClick={() => onOpenTopic(last.sectionCode, last.topicId)}
            className="mt-2 flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-bg px-3 text-left"
          >
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Continue</span>
              <span className="text-sm font-medium">{last.topicName}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </button>
        ) : null}

        {hits.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-line">
            {hits.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item)}
                className="flex min-h-12 w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 active:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="text-[11px] text-muted">
                    {item.topicName} · {formatHours(item.remaining)} left
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        ) : null}

        {picked ? (
          <div className="mt-3 rounded-xl bg-bg p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{picked.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {picked.sectionName} · {picked.topicName}
                </p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="grid size-11 place-items-center text-muted">
                <X className="size-4" />
              </button>
            </div>
            {prereqs.length > 0 ? (
              <p className="mt-2 text-sm text-warn">
                You have not finished {prereqs.map((row) => row.name).join(", ")} yet.
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("done")}
                className={cn(
                  "min-h-12 rounded-xl text-sm font-medium",
                  status === "done" ? "bg-accent text-white" : "border border-line bg-bg-2",
                )}
              >
                Finished
              </button>
              <button
                type="button"
                onClick={() => setStatus("started")}
                className={cn(
                  "min-h-12 rounded-xl text-sm font-medium",
                  status === "started" ? "bg-accent text-white" : "border border-line bg-bg-2",
                )}
              >
                Not finished
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setHours(chip)}
                  className={cn(
                    "min-h-11 min-w-12 rounded-xl px-3 text-sm font-medium",
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
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-medium text-white"
            >
              Add to today
            </button>
          </div>
        ) : null}
      </section>
      </div>

      <Timetable
        sections={sections}
        windows={windows.byCode}
        week={liveWeek}
        today={today}
        gaStats={gaStats}
        gaSlots={gaSlots}
        onOpenSection={(code) => {
          const section = sections.find((row) => row.code === code);
          const topic = section?.topics.find((row) => !topicCover(row).done) ?? section?.topics[0];
          if (section && topic) onOpenTopic(section.code, topic.id);
        }}
      />

      <CoverageBoard
        sections={sections}
        windows={windows.byCode}
        currentSection={next?.sectionCode}
        currentTopicId={next?.topicId}
        remaining={remaining}
        total={total}
        coveredAll={coveredAll}
        allCount={allTopics.length}
        onOpenTopic={onOpenTopic}
      />
    </div>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-2 px-3 py-3 lg:py-2.5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight lg:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted">{label}</p>
    </div>
  );
}

function Banner({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3.5 py-2.5",
        tone === "warn" ? "border-bad/25 bg-bad/[0.06]" : "border-line bg-bg-2",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", tone === "warn" ? "text-bad" : "text-ink")}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted">{detail}</p>
    </div>
  );
}

function MixRow({ label, value, pct, bar = true }: { label: string; value: string; pct?: number; bar?: boolean }) {
  const width = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="mt-3 min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="min-w-0 leading-snug text-muted">{label}</span>
        <span className="shrink-0 tabular-nums font-medium">{value}</span>
      </div>
      {bar ? (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function topicCover(topic: StudySectionNode["topics"][number]) {
  const load = progressFromChunks(topic.chunks);
  const parked = LATER_CODES.has(topic.code) || DRIP_CODES.has(topic.code);
  const done = load.percent === 100;
  const label = done ? "Covered" : parked ? "Later" : load.percent > 0 ? "In progress" : "Not covered";
  return { load, parked, done, label };
}

function gaSlotMark(slot: GaDaySlot) {
  if (slot.state === "done") return "Done";
  if (slot.state === "today") return "Today";
  if (slot.state === "missed") return slot.chapter ? "Open" : "Missed";
  return "";
}

function Timetable({
  sections,
  windows,
  week,
  gaStats,
  gaSlots,
  onOpenSection,
}: {
  sections: StudySectionNode[];
  windows: Map<string, TopicWindow>;
  week: { date: string; log: DayStudyItem[] }[];
  today: string;
  gaStats: ReturnType<typeof gaAreaStats>;
  gaSlots: GaDaySlot[];
  onOpenSection: (code: string) => void;
}) {
  const lanes: { key: "core" | "later"; title: string; hint: string }[] = [
    { key: "core", title: "Pass 1 · Core", hint: "C → DS → Algo → Discrete → Prob → OS → DB → CN" },
    { key: "later", title: "Pass 2 · Later", hint: "Digital → COA → TOC → Compiler → LA → Calculus" },
  ];
  const previewWeek = gaSlots[0] && week[0] && gaSlots[0].date !== week[0].date;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-bg-2 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Timetable</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        4h / 8h week from Monday 7 Sep. Dates move when you tick work. GA is one EduRev chapter a day from that Monday,
        25 min inside the day.
      </p>
      <div className="mt-3">
        <p className="text-sm font-semibold">Daily · GA</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          {previewWeek
            ? "Clock starts Monday 7 Sep. This is that first week — it will slide when you tick Lecture / DPP / Test."
            : "Quant → Verbal / Spatial / Analytical → PYQ + 11 tests. Missed days keep the same chapter."}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] tabular-nums text-muted">
            {gaStats.done}/{gaStats.total}
          </span>
          {gaStats.byArea
            .filter((row) => row.total > 0)
            .map((row) => (
              <span key={row.area} className="rounded-full bg-bg px-2 py-0.5 text-[11px] tabular-nums text-muted">
                {row.area} {row.done}/{row.total}
              </span>
            ))}
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-line bg-bg">
          {gaSlots.map((slot) => {
            const mark = gaSlotMark(slot);
            return (
              <div
                key={slot.date}
                className="flex min-h-12 items-start gap-3 overflow-hidden border-b border-line px-3 py-2 last:border-b-0"
              >
                <span className="w-[3.5rem] shrink-0 pt-0.5 text-[11px] font-semibold text-muted">
                  {formatShortDate(slot.date)}
                </span>
                <span className="min-w-0 flex-1">
                  {slot.chapter ? (
                    <>
                      <span className="block text-sm font-medium leading-snug">{slot.chapter.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {slot.chapter.area} · {gaWorkHint(slot.chapter)} · 25 min
                      </span>
                    </>
                  ) : (
                    <span className="block text-sm text-muted">
                      {slot.state === "before-clock" ? "Clock starts Monday 7 Sep" : "No GA this day"}
                    </span>
                  )}
                </span>
                {mark ? <span className="shrink-0 pt-0.5 text-[11px] text-muted">{mark}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {lanes.map((lane) => (
          <div key={lane.key} className="min-w-0">
            <p className="text-sm font-semibold">{lane.title}</p>
            <p className="text-[11px] leading-snug text-muted">{lane.hint}</p>
            <div className="mt-1">
              {sections.map((section) => {
                const topics = section.topics.filter((topic) =>
                  lane.key === "core" ? isCoreTopic(topic.code) : LATER_CODES.has(topic.code) && !DRIP_CODES.has(topic.code),
                );
                if (topics.length === 0) return null;
                const stats = progressFromChunks(topics.flatMap((topic) => topic.chunks));
                const win = sectionWindow(
                  topics.map((topic) => topic.code),
                  windows,
                );
                return (
                  <button
                    key={`${lane.key}-${section.code}`}
                    type="button"
                    onClick={() => onOpenSection(section.code)}
                    className="relative mt-1 flex w-full items-start gap-2 overflow-hidden rounded-xl px-2.5 py-2 text-left active:bg-bg"
                  >
                    <span
                      className={cn("absolute inset-y-0 left-0", stats.percent === 100 ? "bg-good/15" : "bg-accent/10")}
                      style={{ width: `${stats.percent}%` }}
                    />
                    <span className="relative min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{section.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                        {stats.percent === 100
                          ? "Covered"
                          : `${formatHours(stats.remaining)} left · ${formatWindow(win.start, win.end, win.later)}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoverageBoard({
  sections,
  windows,
  currentSection,
  currentTopicId,
  remaining,
  total,
  coveredAll,
  allCount,
  onOpenTopic,
}: {
  sections: StudySectionNode[];
  windows: Map<string, TopicWindow>;
  currentSection?: string;
  currentTopicId?: string;
  remaining: number;
  total: number;
  coveredAll: number;
  allCount: number;
  onOpenTopic: (sectionCode: string, topicId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "core" | "later">("all");
  const shown = sections.filter((section) => {
    if (filter === "core") return section.topics.some((topic) => isCoreTopic(topic.code));
    if (filter === "later") return section.topics.some((topic) => !isCoreTopic(topic.code));
    return section.topics.length > 0;
  });

  return (
    <section className="rounded-2xl border border-line bg-bg-2 p-2">
      <div className="flex items-start justify-between gap-2 px-2.5 pt-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Coverage</h2>
          <p className="mt-0.5 text-sm font-medium">
            {coveredAll} / {allCount} topics · full tree
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-1 px-2">
        {(["all", "open", "core", "later"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "min-h-10 flex-1 rounded-full text-[11px] font-medium capitalize",
              filter === key ? "bg-accent text-white" : "bg-bg text-muted",
            )}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="mt-1 lg:grid lg:grid-cols-2 lg:gap-x-2">
        {shown.map((section) => (
          <SectionCoverage
            key={section.code}
            section={section}
            windows={windows}
            filter={filter}
            defaultOpen={section.code === currentSection}
            currentTopicId={currentTopicId}
            onOpenTopic={onOpenTopic}
          />
        ))}
      </div>
      <p className="px-2.5 pb-2 pt-1 text-[11px] text-muted">
        {formatHours(remaining)} of {formatHours(total)} still in the full tree.
      </p>
    </section>
  );
}

function SectionCoverage({
  section,
  windows,
  filter,
  defaultOpen,
  currentTopicId,
  onOpenTopic,
}: {
  section: StudySectionNode;
  windows: Map<string, TopicWindow>;
  filter: "all" | "open" | "core" | "later";
  defaultOpen?: boolean;
  currentTopicId?: string;
  onOpenTopic: (sectionCode: string, topicId: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const visibleTopics =
    filter === "all"
      ? section.topics
      : filter === "open"
        ? section.topics.filter((topic) => !topicCover(topic).done)
        : filter === "later"
          ? section.topics.filter((topic) => !isCoreTopic(topic.code))
          : section.topics.filter((topic) => isCoreTopic(topic.code));
  if (visibleTopics.length === 0) return null;
  const topics = visibleTopics;
  const stats = progressFromChunks(topics.flatMap((topic) => topic.chunks));
  const covered = topics.filter((topic) => topicCover(topic).done).length;
  const parked = topics.every((topic) => topicCover(topic).parked);
  const win = sectionWindow(
    topics.map((topic) => topic.code),
    windows,
  );

  return (
    <details
      className="group/section"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="relative flex min-h-12 list-none items-center gap-2 overflow-hidden rounded-xl px-2.5 py-2 text-left active:bg-bg [&::-webkit-details-marker]:hidden">
        <span
          className={cn("absolute inset-y-0 left-0", stats.percent === 100 ? "bg-good/15" : "bg-accent/10")}
          style={{ width: `${stats.percent}%` }}
        />
        <span className="relative min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium leading-snug">{section.name}</span>
            <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted">
              {stats.percent === 100 ? "Covered" : parked ? "Later" : `${covered}/${topics.length}`}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] text-muted">
            {stats.percent === 100
              ? "All topics covered"
              : `${formatHours(stats.remaining)} left · ${formatWindow(win.start, win.end, parked || win.later)}`}
          </span>
        </span>
        <ChevronRight className="relative size-4 shrink-0 text-muted transition-transform group-open/section:rotate-90" />
      </summary>
      <div className="mb-1 ml-2 border-l border-line pl-1">
        {topics.map((topic) => (
          <TopicCoverage
            key={topic.id}
            sectionCode={section.code}
            topic={topic}
            window={windows.get(topic.code)}
            current={topic.id === currentTopicId}
            onOpenTopic={onOpenTopic}
          />
        ))}
      </div>
    </details>
  );
}

function TopicCoverage({
  sectionCode,
  topic,
  window: topicWindow,
  current,
  onOpenTopic,
}: {
  sectionCode: string;
  topic: StudySectionNode["topics"][number];
  window?: TopicWindow;
  current?: boolean;
  onOpenTopic: (sectionCode: string, topicId: string) => void;
}) {
  const { load, parked, done, label } = topicCover(topic);
  return (
    <details className="group/topic">
      <summary
        className={cn(
          "flex min-h-14 list-none items-center gap-3 rounded-2xl px-3 py-2 text-left active:bg-bg [&::-webkit-details-marker]:hidden",
          current && "bg-accent/5",
        )}
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border",
            done ? "border-good bg-good text-white" : "border-line bg-bg",
          )}
        >
          {done ? <Check className="size-3.5" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium leading-snug", done && "text-muted")}>{topic.name}</span>
          <span className="mt-0.5 block text-[11px] text-muted">
            {done
              ? "Covered"
              : parked
                ? "After core"
                : `${load.doneCount}/${load.chunkCount} chunks · ${formatHours(load.remaining)} left`}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            done ? "bg-good/15 text-good" : parked ? "bg-bg text-muted" : "bg-bg text-muted",
          )}
        >
          {label}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-open/topic:rotate-90" />
      </summary>
      <div className="pb-2 pl-9 pr-2">
        {topic.chunks.map((chunk) => (
          <div key={chunk.id} className="flex min-h-12 items-center gap-2 py-1.5">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border",
                chunk.completed ? "border-good bg-good text-white" : "border-line bg-bg",
              )}
            >
              {chunk.completed ? <Check className="size-3" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm", chunk.completed && "text-muted")}>{chunk.name}</span>
              <span className="text-[11px] text-muted">{chunk.completed ? "Covered" : "Not covered"}</span>
            </span>
            <span className="flex gap-1">
              {[
                ["L", chunk.lectureDone],
                ["D", chunk.dppDone],
                ["T", chunk.testDone],
              ].map(([mark, stepDone]) => (
                <span
                  key={String(mark)}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    stepDone ? "bg-good/15 text-good" : "bg-bg text-muted",
                  )}
                >
                  {mark}
                </span>
              ))}
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onOpenTopic(sectionCode, topic.id)}
          className="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-bg text-xs font-medium active:bg-accent-soft"
        >
          Open this topic
        </button>
        {topicWindow && !done && !parked ? (
          <p className="mt-1.5 text-[11px] text-muted">
            Window {formatWindow(topicWindow.start, topicWindow.end, topicWindow.later)}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function describeLogRow(row: DayStudyItem, catalog: Map<string, StudyWorkItem>) {
  const item = catalog.get(row.chunkId);
  const stepName = row.step && row.step !== "ga" ? STEP_LABEL[row.step] : null;
  const gaTitle = gaLogTitle(row);
  const title = gaTitle
    ? gaTitle
    : stepName
      ? `${stepName} · ${item?.name ?? "Chunk"}`
      : (item?.name ?? "Chunk");
  const unfinished = row.status === "started";
  const detail = gaTitle
    ? `${formatHours(row.hours)} · finished`
    : `${item ? `${item.topicName} · ` : ""}${formatHours(row.hours)}${unfinished ? " · not finished" : " · finished"}`;
  return { title, detail, unfinished };
}

type CarryDay = WeekDayLog & {
  carryIn: number;
  carryOut: number;
  shortfall: number;
  clocked: boolean;
};

function DayPanel({
  day,
  today,
  catalog,
  notes,
  todayLog,
  gaChapter,
  onNotes,
  onLog,
  onDayLog,
}: {
  day: CarryDay;
  today: string;
  catalog: Map<string, StudyWorkItem>;
  notes: string;
  todayLog: DayStudyItem[];
  gaChapter: GaChapter | null;
  onNotes: (value: string) => void;
  onLog: (next: DayStudyItem[]) => void;
  onDayLog: (date: string, nextLog: DayStudyItem[], nextNotes: string) => void;
}) {
  const isToday = day.date === today;
  const rows = isToday ? todayLog : day.log;
  const dayNotes = isToday ? notes : day.notes;
  const nextDate = addDaysISO(day.date, 1);
  const owed = Math.round((day.target + day.carryIn) * 10) / 10;
  const open = rows.filter((row) => row.status === "started");
  const future = day.date > today;
  const hasWork = rows.length > 0 || day.actual > 0.05;
  let story: string;
  if (!day.clocked) {
    story = rows.length
      ? "Optional before Monday. Missing hours do not carry yet."
      : "Nothing logged. Clock starts Monday — missed hours do not carry yet.";
  } else if (day.actual + 0.05 >= owed) {
    story =
      day.carryIn > 0
        ? `Caught up. ${formatHours(day.carryIn)} brought forward is cleared.`
        : "Day complete.";
  } else if (future) {
    story =
      day.carryIn > 0
        ? `Planned ${formatHours(day.target)} plus ${formatHours(day.carryIn)} still open from earlier.`
        : `Planned ${formatHours(day.target)}.`;
  } else {
    story = `${formatHours(day.carryOut)} not done${
      day.carryIn > 0 ? ` (${formatHours(day.carryIn)} already brought forward)` : ""
    }. Carries to ${formatShortDate(nextDate)}.`;
  }

  function write(nextLog: DayStudyItem[], nextNotes = dayNotes) {
    if (isToday) {
      onLog(nextLog);
      if (nextNotes !== notes) onNotes(nextNotes);
      return;
    }
    onDayLog(day.date, nextLog, nextNotes);
  }

  return (
    <section className="rounded-2xl border border-line bg-bg-2 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {isToday ? "Today" : formatLongDate(day.date)}
          </h2>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatHours(isToday ? logHours(todayLog) : day.actual)}
            <span className="text-sm font-medium text-muted"> / {formatHours(day.target)}</span>
          </p>
        </div>
        {day.carryIn > 0 ? (
          <span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-medium text-muted">
            +{formatHours(day.carryIn)} carried in
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{story}</p>
      {gaChapter ? (
        <div className="mt-3 rounded-xl border border-line bg-bg px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">GA · {gaChapter.area}</p>
          <p className="mt-0.5 text-sm font-medium">{gaChapter.name}</p>
          <p className="text-[11px] text-muted">{gaWorkHint(gaChapter)} · 25 min</p>
        </div>
      ) : null}
      {open.length > 0 ? (
        <p className="mt-2 text-sm text-warn">
          {open.length === 1 ? "1 item" : `${open.length} items`} started but not finished — still on the desk.
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          {isToday ? "Nothing yet. Tick a step above, or search a topic." : "Nothing studied."}
        </p>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {rows.map((row) => {
            const item = describeLogRow(row, catalog);
            return (
              <div key={logKey(row)} className="flex min-h-14 items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted">{item.detail}</span>
                </span>
                <button
                  type="button"
                  onClick={() => write(removeLog(rows, row))}
                  className="min-h-12 shrink-0 px-3 text-sm text-muted"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
      {hasWork ? (
        <button
          type="button"
          onClick={() => write([], "")}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-bg text-sm font-medium active:bg-accent-soft"
        >
          I did not study this day
        </button>
      ) : null}
      {isToday ? (
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
      ) : dayNotes ? (
        <p className="mt-3 text-sm text-muted">{dayNotes}</p>
      ) : null}
    </section>
  );
}

function WeekStrip({
  week,
  selected,
  onSelect,
}: {
  week: CarryDay[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {week.map((day, i) => {
        const hit = day.actual >= day.target && day.target > 0;
        const fill = day.target <= 0 ? 0 : Math.min(100, Math.round((day.actual / day.target) * 100));
        const missed = day.clocked && day.carryOut > 0.05;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={cn(
              "flex h-[7.25rem] flex-col items-center justify-end gap-1 rounded-xl px-0.5 py-1.5 active:bg-accent-soft lg:h-[5.5rem]",
              day.date === selected ? "bg-accent/10" : "",
            )}
            aria-pressed={day.date === selected}
            aria-label={`${day.date}: ${formatHours(day.actual)} of ${formatHours(day.target)}`}
          >
            <span className="flex h-[4.5rem] w-4 flex-col justify-end overflow-hidden rounded-md bg-line/80 lg:h-14">
              <span
                className={cn(
                  "w-full rounded-sm",
                  hit ? "bg-good" : missed ? "bg-warn" : fill > 0 ? "bg-accent" : "bg-transparent",
                )}
                style={{ height: `${Math.max(fill, missed && fill === 0 ? 10 : fill)}%` }}
              />
            </span>
            <span className={cn("text-[10px] font-semibold", day.date === selected ? "text-accent" : "text-muted")}>
              {DAY_LETTERS[i]}
            </span>
          </button>
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
