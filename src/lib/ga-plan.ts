import catalog from "../../data/catalogs/edurev-gate-cse-3month.json";
import { GA_DRIP_HOURS, GA_DRIP_ID, removeLog, upsertLog, type DayStudyItem } from "@/lib/day-log";
import { addDaysISO, weekdayUTC } from "@/lib/dates";
import { splitStepHours, START_DATE, STEP_KINDS, STEP_LABEL, type StepFlags, type StepKind } from "@/lib/study-load";
import { weekMonday } from "@/lib/work-week";

export type GaArea = "Quant" | "Verbal" | "Spatial" | "Analytical" | "PYQ";

export type GaChapter = {
  id: string;
  name: string;
  area: GaArea;
  month: 1 | 2 | 3;
  videos: number;
  docs: number;
  tests: number;
};

type CatalogNode = {
  name: string;
  videos?: number;
  docs?: number;
  tests?: number;
  children?: CatalogNode[];
};

const SKIP_MONTH3 = new Set(["Formula Sheet", "Toppers Handwritten Notes"]);

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function leaf(area: GaArea, month: 1 | 2 | 3, node: CatalogNode): GaChapter {
  return {
    id: `ga:${month}:${slug(area)}:${slug(node.name)}`,
    name: node.name,
    area,
    month,
    videos: node.videos ?? 0,
    docs: node.docs ?? 0,
    tests: node.tests ?? 0,
  };
}

function areaFromTopic(name: string): GaArea | null {
  if (name.startsWith("Quantitative")) return "Quant";
  if (name.startsWith("Verbal")) return "Verbal";
  if (name.startsWith("Spatial")) return "Spatial";
  if (name.startsWith("Analytical")) return "Analytical";
  return null;
}

function chaptersFromCatalog(): GaChapter[] {
  const out: GaChapter[] = [];
  for (const unit of catalog.units) {
    const subject = unit.subjects.find((row) => row.gate === "GA");
    if (!subject) continue;
    const month = unit.id === "month-1" ? 1 : unit.id === "month-2" ? 2 : 3;
    for (const topic of subject.topics as CatalogNode[]) {
      const area = areaFromTopic(topic.name);
      if (area && topic.children?.length) {
        for (const child of topic.children) out.push(leaf(area, month, child));
        continue;
      }
      if (month !== 3) continue;
      if (SKIP_MONTH3.has(topic.name)) continue;
      if (topic.name.startsWith("Practice Tests")) {
        const count = Math.max(topic.tests ?? 11, 1);
        for (let n = 1; n <= count; n += 1) {
          out.push({
            id: `ga:3:pyq:practice-${n}`,
            name: `Practice test ${n}`,
            area: "PYQ",
            month: 3,
            videos: 0,
            docs: 0,
            tests: 1,
          });
        }
        continue;
      }
      if (topic.name.startsWith("Previous Year")) {
        out.push(leaf("PYQ", 3, { ...topic, name: "GA previous year questions" }));
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((chapter) => {
    if (seen.has(chapter.id)) return false;
    seen.add(chapter.id);
    return true;
  });
}

const CHAPTERS = chaptersFromCatalog();
const BY_ID = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]));

export function gaChapters() {
  return CHAPTERS;
}

export function gaChapterById(id: string) {
  return BY_ID.get(id);
}

export function isNamedGaId(id: string) {
  return id.startsWith("ga:") && id !== GA_DRIP_ID;
}

export function namedGaFrom(log: DayStudyItem[]) {
  for (const row of log) {
    if (row.status === "done" && isNamedGaId(row.chunkId)) {
      const chapter = BY_ID.get(row.chunkId);
      if (chapter) return chapter;
    }
  }
  return null;
}

export function gaStepsFromLog(log: DayStudyItem[], chapterId: string): StepFlags {
  if (log.some((row) => row.chunkId === chapterId && row.step === "ga" && row.status === "done")) {
    return { lectureDone: true, dppDone: true, testDone: true };
  }
  return {
    lectureDone: log.some((row) => row.chunkId === chapterId && row.step === "lecture" && row.status === "done"),
    dppDone: log.some((row) => row.chunkId === chapterId && row.step === "dpp" && row.status === "done"),
    testDone: log.some((row) => row.chunkId === chapterId && row.step === "test" && row.status === "done"),
  };
}

export function gaChapterComplete(log: DayStudyItem[], chapterId: string) {
  const steps = gaStepsFromLog(log, chapterId);
  return steps.lectureDone && steps.dppDone && steps.testDone;
}

export function collectGaDone(logs: DayStudyItem[][]) {
  const done = new Set<string>();
  for (const log of logs) {
    const ids = new Set(log.filter((row) => isNamedGaId(row.chunkId)).map((row) => row.chunkId));
    for (const id of ids) {
      if (gaChapterComplete(log, id)) done.add(id);
    }
  }
  return done;
}

export function nextGaChapter(done: Set<string>) {
  return CHAPTERS.find((chapter) => !done.has(chapter.id)) ?? null;
}

export function gaWorkHint(chapter: GaChapter) {
  if (chapter.tests > 0) {
    return `EduRev · ${chapter.tests} test${chapter.tests === 1 ? "" : "s"}`;
  }
  if (chapter.docs > 0) return "EduRev notes";
  return "EduRev";
}

export function isWeekend(iso: string) {
  const dow = weekdayUTC(iso);
  return dow === 0 || dow === 6;
}

export function gaAreaStats(done: Set<string>) {
  const areas: GaArea[] = ["Quant", "Verbal", "Spatial", "Analytical", "PYQ"];
  const byArea = areas.map((area) => {
    const rows = CHAPTERS.filter((chapter) => chapter.area === area);
    const finished = rows.filter((chapter) => done.has(chapter.id)).length;
    return { area, done: finished, total: rows.length };
  });
  return {
    done: CHAPTERS.filter((chapter) => done.has(chapter.id)).length,
    total: CHAPTERS.length,
    byArea,
  };
}

/** Remaining EduRev chapters laid from the 7 Sep clock, one per day. Days before that get nothing. */
export function assignUpcomingGa(
  dates: string[],
  today: string,
  done: Set<string>,
  todayComplete = false,
  startDate = START_DATE,
) {
  const remaining = CHAPTERS.filter((chapter) => !done.has(chapter.id));
  const from = today < startDate ? startDate : today;
  const map = new Map<string, GaChapter>();
  dates
    .filter((date) => date >= startDate)
    .filter((date) => (todayComplete ? date > today : date >= from))
    .forEach((date, index) => {
      const chapter = remaining[index];
      if (chapter) map.set(date, chapter);
    });
  return map;
}

export type GaDaySlot = {
  date: string;
  chapter: GaChapter | null;
  state: "before-clock" | "missed" | "done" | "today" | "planned";
};

/** If this calendar week is still before Monday 7 Sep, show the first clock week instead. */
export function gaDisplayWeek(weekDates: string[], startDate = START_DATE) {
  const end = weekDates[weekDates.length - 1];
  if (!end || end < startDate) {
    const monday = weekMonday(startDate);
    return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  }
  return weekDates;
}

export function planGaWeek(args: {
  weekDates: string[];
  today: string;
  done: Set<string>;
  logsByDate: Map<string, DayStudyItem[]>;
  todayComplete?: boolean;
  startDate?: string;
}): GaDaySlot[] {
  const startDate = args.startDate ?? START_DATE;
  const dates = gaDisplayWeek(args.weekDates, startDate);
  const upcoming = assignUpcomingGa(dates, args.today, args.done, args.todayComplete ?? false, startDate);
  return dates.map((date) => {
    const log = args.logsByDate.get(date) ?? [];
    const logged = namedGaFrom(log);
    if (date < startDate) return { date, chapter: logged, state: "before-clock" };
    if (logged && gaChapterComplete(log, logged.id)) return { date, chapter: logged, state: "done" };
    if (date < args.today) return { date, chapter: logged, state: "missed" };
    const planned = upcoming.get(date) ?? logged;
    if (date === args.today) return { date, chapter: planned, state: "today" };
    return { date, chapter: planned, state: "planned" };
  });
}

export function toggleGaStep(log: DayStudyItem[], chapter: GaChapter, kind: StepKind, done: boolean) {
  let next = removeLog(log, { chunkId: GA_DRIP_ID, step: "ga" });
  next = removeLog(next, { chunkId: chapter.id, step: "ga" });
  if (!done) return removeLog(next, { chunkId: chapter.id, step: kind });
  return upsertLog(next, {
    chunkId: chapter.id,
    step: kind,
    status: "done",
    hours: splitStepHours(GA_DRIP_HOURS)[kind],
  });
}

export function toggleGaChapter(log: DayStudyItem[], chapter: GaChapter) {
  if (gaChapterComplete(log, chapter.id)) {
    return STEP_KINDS.reduce(
      (acc, kind) => removeLog(acc, { chunkId: chapter.id, step: kind }),
      removeLog(removeLog(log, { chunkId: GA_DRIP_ID, step: "ga" }), { chunkId: chapter.id, step: "ga" }),
    );
  }
  return STEP_KINDS.reduce((acc, kind) => toggleGaStep(acc, chapter, kind, true), log);
}

export function gaLogTitle(row: DayStudyItem) {
  const chapter = gaChapterById(row.chunkId);
  if (chapter && row.step && row.step !== "ga") return `${STEP_LABEL[row.step]} · ${chapter.name}`;
  if (chapter) return `GA · ${chapter.name}`;
  if (row.chunkId === GA_DRIP_ID || row.step === "ga") return "GA drip";
  return null;
}
