import { todayISO } from "@/lib/dates";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";
import { StudyApp } from "@/components/study-app";
import { loadStudyTree, loadTodayLog, loadWorkWeek } from "@/lib/study-tree";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; topic?: string; chunk?: string }>;
}) {
  const params = await searchParams;
  if (!(await isDatabaseUp())) return <SetupNeeded />;

  const today = todayISO();
  const [sections, log, week] = await Promise.all([loadStudyTree(), loadTodayLog(today), loadWorkWeek(today)]);

  return (
    <StudyApp
      today={today}
      sections={sections}
      notes={log.notes}
      log={log.log}
      hoursByDow={week.hoursByDow}
      week={week.week}
      initialPath={{
        section: params.section,
        topic: params.topic,
        chunk: params.chunk,
      }}
    />
  );
}
