import { prisma } from "@/lib/prisma";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";
import { weightageText } from "@/lib/coverage";
import { EXAM_DATE, FIRST_PASS_DATE, formatHours, sectionProgress, topicProgress } from "@/lib/study-load";
import { daysUntil, formatShortDate, todayISO, toISODate } from "@/lib/dates";
import { catalogSplit, DRIP_CODES, hoursFromMinutes, isCoreTopic, LATER_CODES, workWeekPace } from "@/lib/work-week";
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
  const coreTopics = allTopics.filter((topic) => isCoreTopic(topic.code));
  const laterTopics = allTopics.filter((topic) => LATER_CODES.has(topic.code) && !DRIP_CODES.has(topic.code));
  const core = sectionProgress(coreTopics);
  const later = sectionProgress(laterTopics);
  const treeHours = core.hours + later.hours;
  const treeRemaining = core.remaining + later.remaining;
  const deadline = settings ? toISODate(settings.firstPassDeadline) : FIRST_PASS_DATE;
  const examDate = settings ? toISODate(settings.examDate) : EXAM_DATE;
  const today = todayISO();
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
    remainingHours: treeRemaining,
    totalHours: treeHours,
    loggedHours: 0,
    coreRemaining: core.remaining,
    coreTotal: core.hours,
    hoursByDow,
    deadline,
    examDate,
  });
  const split = catalogSplit();

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stats</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Full tree is core + later on the 4h/8h week. GA is one EduRev chapter a day, 25 min inside the weekday.
          Reality check is versus 7 Feb, not only 31 Dec.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-bg-2 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Full tree</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {treeHours === 0 ? 0 : Math.round(((treeHours - treeRemaining) / treeHours) * 100)}%
          </p>
          <p className="mt-2 text-sm text-muted">
            {formatHours(treeRemaining)} left of {formatHours(treeHours)}
            {windows.tree.start && windows.tree.end ? ` · ${formatWindow(windows.tree.start, windows.tree.end)}` : ""}
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-bg-2 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Estimated full finish</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {pace.projectedFinish ? formatShortDate(pace.projectedFinish) : "—"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {pace.treeFits
              ? `Fits before exam · ${formatHours(pace.capacityToExam)} to 7 Feb`
              : `${pace.treeSlipDays}d past 7 Feb at 36h/week · ${formatHours(pace.capacityToExam)} on the calendar`}
          </p>
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Reality check</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Core {formatHours(core.remaining)} / {formatHours(split.core)} vs {formatHours(pace.capacityLeft)} to 31 Dec.
          Later {formatHours(later.remaining)} / {formatHours(split.later)} after that. GA {formatHours(split.ga)} sits
          inside the 4h. Exam {daysUntil(today, examDate)}d away.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${overall.percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Including GA ticks: {overall.percent}% of {formatHours(overall.hours)}.
        </p>
      </div>
      <div className="grid gap-2">
        {sections.map((section) => {
          const topics = section.subjects.flatMap((s) => s.topics);
          const stats = sectionProgress(topics);
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
                  {stats.remaining <= 0 ? " · covered" : ` · ${formatWindow(win.start, win.end, win.later)}`}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="tabular-nums font-medium">{stats.percent}%</div>
                <div className="text-xs text-muted">{stats.days === 0 ? "done" : `${stats.days}d`}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
