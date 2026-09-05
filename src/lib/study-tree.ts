import { prisma } from "@/lib/prisma";
import { addDaysISO, toDateOnly, toISODate, todayISO, weekdayUTC } from "@/lib/dates";
import { weightageText } from "@/lib/coverage";
import { STUDY_LOAD, progressFromChunks, topicProgress } from "@/lib/study-load";
import { syncChunkSteps, syncStudySubtopics, syncWorkWeek } from "@/lib/sync-subtopics";
import { parseDayRecord, type DayStudyItem } from "@/lib/day-log";
import { TOPIC_PREREQS } from "@/lib/prereqs";
import {
  HIGH_YIELD_ORDER,
  hoursFromMinutes,
  isCoreTopic,
  weekMonday,
  type HoursByDow,
} from "@/lib/work-week";

export type StudyChunkNode = {
  id: string;
  name: string;
  hours: number;
  remaining: number;
  completed: boolean;
  lectureDone: boolean;
  dppDone: boolean;
  testDone: boolean;
};

export type StudyTopicNode = {
  id: string;
  code: string;
  name: string;
  chunks: StudyChunkNode[];
};

export type StudySectionNode = {
  code: string;
  name: string;
  weightage: string;
  topics: StudyTopicNode[];
};

export type StudyWorkItem = StudyChunkNode & {
  sectionCode: string;
  sectionName: string;
  topicId: string;
  topicName: string;
  topicCode: string;
};

const include = {
  subjects: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      topics: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          subtopics: {
            orderBy: { sortOrder: "asc" as const },
            select: { id: true, name: true, completed: true, lectureDone: true, dppDone: true, testDone: true },
          },
        },
      },
    },
  },
};

function mapSections(
  rows: {
    code: string;
    name: string;
    officialFixedMarks: number | null;
    pyqAvgMarks: number | null;
    pyqRangeLow: number | null;
    pyqRangeHigh: number | null;
    subjects: {
      topics: {
        id: string;
        code: string;
        name: string;
        subtopics: {
          id: string;
          name: string;
          completed: boolean;
          lectureDone: boolean;
          dppDone: boolean;
          testDone: boolean;
        }[];
      }[];
    }[];
  }[],
): StudySectionNode[] {
  return rows.map((section) => ({
    code: section.code,
    name: section.name,
    weightage: weightageText(section),
    topics: section.subjects.flatMap((subject) =>
      subject.topics.map((topic) => {
        const load = topicProgress(topic.code, topic.subtopics);
        return {
          id: topic.id,
          code: topic.code,
          name: topic.name,
          chunks: load.chunks
            .filter((chunk): chunk is typeof chunk & { id: string } => Boolean(chunk.id))
            .map((chunk) => ({
              id: chunk.id,
              name: chunk.name,
              hours: chunk.hours,
              remaining: chunk.remaining,
              completed: chunk.completed,
              lectureDone: chunk.lectureDone,
              dppDone: chunk.dppDone,
              testDone: chunk.testDone,
            })),
        };
      }),
    ),
  }));
}

function missingChunkIds(sections: StudySectionNode[]) {
  return sections.some((section) =>
    section.topics.some((topic) => {
      const catalog = STUDY_LOAD[topic.code] ?? [];
      return catalog.length > 0 && topic.chunks.length !== catalog.length;
    }),
  );
}

export async function loadStudyTree(): Promise<StudySectionNode[]> {
  await syncChunkSteps();
  const pull = () => prisma.section.findMany({ orderBy: { sortOrder: "asc" }, include });
  let sections = mapSections(await pull());
  if (missingChunkIds(sections)) {
    await syncStudySubtopics();
    sections = mapSections(await pull());
  }
  return sections;
}

export async function loadTodayLog(date = todayISO()) {
  const row = await prisma.studySession.findUnique({ where: { date: toDateOnly(date) } });
  const parsed = parseDayRecord(row?.notes);
  return {
    notes: parsed.notes,
    log: parsed.log as DayStudyItem[],
    loggedHours: row ? row.actualMinutes / 60 : 0,
  };
}

export function remainingHours(sections: StudySectionNode[]) {
  return sections.reduce(
    (sum, section) =>
      sum +
      section.topics.reduce(
        (topicSum, topic) => topicSum + topic.chunks.reduce((h, chunk) => h + chunk.remaining, 0),
        0,
      ),
    0,
  );
}

export function totalHours(sections: StudySectionNode[]) {
  return sections.reduce(
    (sum, section) =>
      sum + section.topics.reduce((topicSum, topic) => topicSum + topic.chunks.reduce((h, chunk) => h + chunk.hours, 0), 0),
    0,
  );
}

export function allChunks(sections: StudySectionNode[]): StudyWorkItem[] {
  const items: StudyWorkItem[] = [];
  for (const section of sections) {
    for (const topic of section.topics) {
      for (const chunk of topic.chunks) {
        items.push({
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
  return items;
}

export function searchChunks(sections: StudySectionNode[], query: string): StudyWorkItem[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];
  return allChunks(sections)
    .filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.topicName.toLowerCase().includes(needle) ||
        item.sectionName.toLowerCase().includes(needle),
    )
    .slice(0, 8);
}

export function findTopic(sections: StudySectionNode[], topicId: string) {
  for (const section of sections) {
    const topic = section.topics.find((row) => row.id === topicId);
    if (topic) return { section, topic };
  }
  return null;
}

export function unfinishedPrereqs(sections: StudySectionNode[], topicCode: string) {
  return TOPIC_PREREQS.filter(([, to]) => to === topicCode)
    .map(([from]) => {
      for (const section of sections) {
        const topic = section.topics.find((row) => row.code === from);
        if (topic) return { code: from, name: topic.name, percent: progressFromChunks(topic.chunks).percent };
      }
      return null;
    })
    .filter((row): row is { code: string; name: string; percent: number } => Boolean(row) && row.percent < 100);
}

export function coreProgress(sections: StudySectionNode[]) {
  let hours = 0;
  let remaining = 0;
  for (const section of sections) {
    for (const topic of section.topics) {
      if (!isCoreTopic(topic.code)) continue;
      const stats = progressFromChunks(topic.chunks);
      hours += stats.hours;
      remaining += stats.remaining;
    }
  }
  return { hours, remaining };
}

export function suggestedNext(sections: StudySectionNode[]) {
  for (const code of HIGH_YIELD_ORDER) {
    for (const section of sections) {
      const topic = section.topics.find((row) => row.code === code);
      if (!topic) continue;
      const stats = progressFromChunks(topic.chunks);
      if (stats.percent >= 100) continue;
      if (unfinishedPrereqs(sections, code).length > 0) continue;
      const nextChunk = topic.chunks.find((chunk) => !chunk.completed);
      return {
        sectionCode: section.code,
        sectionName: section.name,
        topicId: topic.id,
        topicName: topic.name,
        topicCode: topic.code,
        remaining: stats.remaining,
        chunkId: nextChunk?.id,
        chunkName: nextChunk?.name,
        chunk: nextChunk,
      };
    }
  }
  return null;
}

export type WeekDayLog = {
  date: string;
  target: number;
  actual: number;
  isToday: boolean;
};

export async function loadWorkWeek(today = todayISO()): Promise<{
  hoursByDow: HoursByDow;
  week: WeekDayLog[];
}> {
  await syncWorkWeek();
  const rows = await prisma.weekdayHours.findMany();
  const hoursByDow = hoursFromMinutes(rows);
  const monday = weekMonday(today);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const sessions = await prisma.studySession.findMany({
    where: {
      date: { gte: toDateOnly(dates[0]), lte: toDateOnly(dates[6]) },
    },
  });
  const byDate = new Map(sessions.map((row) => [toISODate(row.date), row.actualMinutes / 60]));
  return {
    hoursByDow,
    week: dates.map((date) => ({
      date,
      target: hoursByDow[weekdayUTC(date)] ?? 0,
      actual: Math.round((byDate.get(date) ?? 0) * 10) / 10,
      isToday: date === today,
    })),
  };
}
