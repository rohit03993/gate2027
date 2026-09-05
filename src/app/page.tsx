import { addDaysISO, todayISO } from "@/lib/dates";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";
import { StudyApp } from "@/components/study-app";
import { loadGaDoneOutsideWeek, loadStudyTree, loadTodayLog, loadWorkWeek } from "@/lib/study-tree";
import { weekMonday } from "@/lib/work-week";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; topic?: string; chunk?: string; reset?: string }>;
}) {
  const params = await searchParams;
  if (!(await isDatabaseUp())) return <SetupNeeded />;

  const today = todayISO();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekMonday(today), i));
  const [sections, log, week, gaDoneOutsideWeek] = await Promise.all([
    loadStudyTree(),
    loadTodayLog(today),
    loadWorkWeek(today),
    loadGaDoneOutsideWeek(weekDates),
  ]);

  return (
    <StudyApp
      key={params.reset ? `reset-${params.reset}` : "live"}
      today={today}
      sections={sections}
      notes={log.notes}
      log={log.log}
      hoursByDow={week.hoursByDow}
      week={week.week}
      gaDoneOutsideWeek={gaDoneOutsideWeek}
      initialPath={{
        section: params.section,
        topic: params.topic,
        chunk: params.chunk,
      }}
    />
  );
}
