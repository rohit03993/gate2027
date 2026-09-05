import { prisma } from "@/lib/prisma";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";
import { weightageText } from "@/lib/coverage";
import { sectionProgress, topicProgress } from "@/lib/study-load";
import { SectionCard } from "@/components/section-card";
import { syncChunkSteps, syncWorkWeek } from "@/lib/sync-subtopics";
import { hoursFromMinutes } from "@/lib/work-week";
import { formatWindow, scheduleTopicWindows, sectionWindow } from "@/lib/windows";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SyllabusPage() {
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  await syncWorkWeek();
  await syncChunkSteps();
  const [sections, hourRows] = await Promise.all([
    prisma.section.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        subjects: {
          include: {
            topics: { include: { subtopics: true } },
          },
        },
      },
    }),
    prisma.weekdayHours.findMany(),
  ]);
  const hoursByDow = hoursFromMinutes(hourRows);
  const today = todayISO();
  const windows = scheduleTopicWindows({
    today,
    hoursByDow,
    topics: sections.flatMap((section) =>
      section.subjects.flatMap((subject) =>
        subject.topics.map((topic) => ({
          code: topic.code,
          remainingHours: topicProgress(topic.code, topic.subtopics).remaining,
        })),
      ),
    ),
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Syllabus</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Hours add up from chunk → topic → subject. Finish-by dates are the full tree on your 4h / 8h week: core
          first, then Digital → COA → TOC → Compiler → maths leftover. GA follows the EduRev chapter list, 25 min
          inside each day.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sections.map((section) => {
          const topics = section.subjects.flatMap((s) => s.topics);
          const stats = sectionProgress(topics);
          const win = sectionWindow(
            topics.map((topic) => topic.code),
            windows.byCode,
          );
          return (
            <SectionCard
              key={section.id}
              href={`/?section=${section.code}`}
              name={section.name}
              weightage={weightageText(section)}
              percent={stats.percent}
              days={stats.days}
              topicCount={topics.length}
              hours={stats.hours}
              remainingHours={stats.remaining}
              finishBy={stats.remaining <= 0 ? "covered" : formatWindow(win.start, win.end, win.later)}
            />
          );
        })}
      </div>
    </div>
  );
}
