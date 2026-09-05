import { prisma } from "@/lib/prisma";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";
import { weightageText } from "@/lib/coverage";
import { FIRST_PASS_DATE, formatHours, sectionProgress, topicProgress } from "@/lib/study-load";
import { daysUntil, todayISO, toISODate } from "@/lib/dates";
import { DRIP_CODES, hoursFromMinutes, LATER_CODES, workWeekPace } from "@/lib/work-week";
import { syncChunkSteps, syncWorkWeek } from "@/lib/sync-subtopics";
import { formatWindow, scheduleTopicWindows, sectionWindow } from "@/lib/windows";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  await syncWorkWeek();
  await syncChunkSteps();
  const [sections, settings, hourRows] = await Promise.all([
    prisma.section.findMany({
      orderBy: { sortOrder: "asc" },
      include: { subjects: { include: { topics: { include: { subtopics: true } } } } },
    }),
    prisma.settings.findFirst(),
    prisma.weekdayHours.findMany(),
  ]);
  const allTopics = sections.flatMap((s) => s.subjects.flatMap((sub) => sub.topics));
  const overall = sectionProgress(allTopics);
  const coreTopics = allTopics.filter((topic) => !LATER_CODES.has(topic.code) && !DRIP_CODES.has(topic.code));
  const core = sectionProgress(coreTopics);
  const deadline = settings ? toISODate(settings.firstPassDeadline) : FIRST_PASS_DATE;
  const today = todayISO();
  const left = daysUntil(today, deadline);
  const hoursByDow = hoursFromMinutes(hourRows);
  const windows = scheduleTopicWindows({
    today,
    hoursByDow,
    topics: allTopics.map((topic) => ({
      code: topic.code,
      remainingHours: topicProgress(topic.code, topic.subtopics).remaining,
    })),
  });
  const pace = workWeekPace({
    today,
    remainingHours: overall.remaining,
    totalHours: overall.hours,
    loggedHours: 0,
    coreRemaining: core.remaining,
    coreTotal: core.hours,
    hoursByDow,
    deadline,
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stats</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Office week {formatHours(pace.weeklyHours)}. Today is a {formatHours(pace.todayTarget)} day. First pass by 31
          Dec is core subjects, not the full {formatHours(overall.hours)} catalogue.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-bg-2 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Core coverage</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {core.hours === 0 ? 0 : Math.round(((core.hours - core.remaining) / core.hours) * 100)}%
          </p>
          <p className="mt-2 text-sm text-muted">
            {formatHours(core.remaining)} left of {formatHours(core.hours)}
            {windows.core.start && windows.core.end
              ? ` · finish by ${formatWindow(windows.core.start, windows.core.end)}`
              : core.remaining <= 0
                ? " · covered"
                : ""}
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-bg-2 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Hours left till 31 Dec</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{formatHours(pace.capacityLeft)}</p>
          <p className="mt-2 text-sm text-muted">
            {left} days · {pace.coreFits ? "core fits this calendar" : "core is tighter than the calendar — keep order"}
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Full syllabus</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{overall.percent}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${overall.percent}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted">
          {formatHours(overall.remaining)} left of {formatHours(overall.hours)}. DL, COA, TOC, Compiler wait until core
          is moving.
        </p>
      </div>
      <div className="grid gap-2">
        {sections.map((section) => {
          const topics = section.subjects.flatMap((s) => s.topics);
          const stats = sectionProgress(topics);
          const later = topics.length > 0 && topics.every((topic) => LATER_CODES.has(topic.code));
          const win = sectionWindow(
            topics.map((topic) => topic.code),
            windows.byCode,
          );
          return (
            <Link
              key={section.id}
              href={`/?section=${section.code}`}
              className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-line bg-bg-2 px-4 py-3 active:bg-bg"
            >
              <div>
                <div className="font-medium">{section.name}</div>
                <div className="text-xs text-muted">
                  {weightageText(section)} · {stats.remaining.toFixed(0)}h left of {stats.hours}h
                  {stats.remaining <= 0
                    ? " · covered"
                    : ` · ${formatWindow(win.start, win.end, later || win.later)}`}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="tabular-nums font-medium">{later && stats.percent < 100 ? "Later" : `${stats.percent}%`}</div>
                <div className="text-xs text-muted">{stats.days === 0 ? "done" : `${stats.days}d`}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
