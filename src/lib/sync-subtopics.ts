import { prisma } from "@/lib/prisma";
import { FIRST_PASS_DATE, STUDY_LOAD } from "@/lib/study-load";
import { toDateOnly, toISODate } from "@/lib/dates";
import { DEFAULT_MINUTES_BY_DOW, LEGACY_MINUTES_BY_DOW } from "@/lib/work-week";

export async function syncStudySubtopics() {
  const topics = await prisma.topic.findMany({ include: { subtopics: true } });
  const needsWrite = topics.some((topic) => {
    const catalog = STUDY_LOAD[topic.code];
    if (!catalog) return false;
    if (topic.subtopics.length !== catalog.length) return true;
    return catalog.some((chunk, i) => topic.subtopics[i]?.name !== chunk.name);
  });

  if (needsWrite) {
    for (const topic of topics) {
      const catalog = STUDY_LOAD[topic.code];
      if (!catalog) continue;
      const byName = new Map(topic.subtopics.map((row) => [row.name, row]));
      const keep = new Set(catalog.map((chunk) => chunk.name));

      for (let i = 0; i < catalog.length; i++) {
        const chunk = catalog[i];
        const existing = byName.get(chunk.name);
        if (!existing) {
          await prisma.subtopic.create({
            data: {
              topicId: topic.id,
              name: chunk.name,
              sortOrder: i,
              pyqFrequency: topic.pyqFrequency,
            },
          });
        } else if (existing.sortOrder !== i) {
          await prisma.subtopic.update({
            where: { id: existing.id },
            data: { sortOrder: i },
          });
        }
      }

      for (const old of topic.subtopics) {
        if (!keep.has(old.name)) {
          await prisma.subtopic.delete({ where: { id: old.id } });
        }
      }
    }
  }

  await syncChunkSteps();

  const settings = await prisma.settings.findFirst();
  if (settings && toISODate(settings.firstPassDeadline) < FIRST_PASS_DATE) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: { firstPassDeadline: toDateOnly(FIRST_PASS_DATE) },
    });
  }
}

/** One-time: office week 4h Mon–Fri / 8h Sat–Sun if hours were still the old seed. */
export async function syncWorkWeek() {
  const rows = await prisma.weekdayHours.findMany();
  if (rows.length === 0) {
    await prisma.weekdayHours.createMany({
      data: DEFAULT_MINUTES_BY_DOW.map((minutes, weekday) => ({ weekday, minutes })),
    });
  } else {
    const current = [0, 0, 0, 0, 0, 0, 0];
    for (const row of rows) current[row.weekday] = row.minutes;
    const isLegacy = LEGACY_MINUTES_BY_DOW.every((minutes, i) => current[i] === minutes);
    if (isLegacy) {
      for (let weekday = 0; weekday <= 6; weekday++) {
        await prisma.weekdayHours.upsert({
          where: { weekday },
          update: { minutes: DEFAULT_MINUTES_BY_DOW[weekday] },
          create: { weekday, minutes: DEFAULT_MINUTES_BY_DOW[weekday] },
        });
      }
    }
  }

  const settings = await prisma.settings.findFirst();
  if (!settings) return;
  const looksDefault = settings.minDailyMinutes === 180 && settings.maxDailyMinutes === 600;
  if (looksDefault) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: {
        minDailyMinutes: 240,
        maxDailyMinutes: 480,
        gaDripMinutes: 25,
        preferredWindow:
          settings.preferredWindow === "06:00-13:00" ? "06:00-08:15, 21:00-22:30" : settings.preferredWindow,
      },
    });
  }
}

/** Old ticks marked the whole chunk done. Copy that onto Lecture / DPP / Test. */
export async function syncChunkSteps() {
  await prisma.subtopic.updateMany({
    where: {
      completed: true,
      lectureDone: false,
      dppDone: false,
      testDone: false,
    },
    data: {
      lectureDone: true,
      dppDone: true,
      testDone: true,
    },
  });
}
