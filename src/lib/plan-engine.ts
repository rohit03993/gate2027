import { TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { generateSchedule, hoursBehind } from "./scheduler";
import { addDaysISO, toDateOnly, toISODate, todayISO } from "./dates";

export async function loadSchedulerContext() {
  const [settings, weekdayHours, commitments, phases, topics, deps, tasks] = await Promise.all([
    prisma.settings.findFirstOrThrow(),
    prisma.weekdayHours.findMany(),
    prisma.commitment.findMany(),
    prisma.phase.findMany(),
    prisma.topic.findMany({ include: { subject: true, tasks: true } }),
    prisma.topicDependency.findMany(),
    prisma.studyTask.findMany(),
  ]);

  const hoursArr = [0, 0, 0, 0, 0, 0, 0];
  for (const h of weekdayHours) hoursArr[h.weekday] = h.minutes;

  const completedTopicIds = topics
    .filter((topic) => {
      const firstPass = topic.tasks.filter((t) => t.taskType === "LECTURE" || t.taskType === "NOTES");
      return firstPass.length > 0 && firstPass.every((t) => t.status === "COMPLETED");
    })
    .map((t) => t.id);

  return {
    settings,
    hoursArr,
    commitments,
    phases,
    topics,
    deps,
    tasks,
    completedTopicIds,
  };
}

export async function regenerateFrom(fromDate: string) {
  const ctx = await loadSchedulerContext();
  const from = toDateOnly(fromDate);

  await prisma.dailyPlanItem.deleteMany({
    where: { date: { gte: from } },
  });

  const firstDates = new Map<string, string>();
  const pastItems = await prisma.dailyPlanItem.findMany({
    where: { date: { lt: from } },
    orderBy: { date: "asc" },
  });
  for (const item of pastItems) {
    if (!firstDates.has(item.taskId)) firstDates.set(item.taskId, toISODate(item.date));
  }

  const plan = generateSchedule({
    fromDate,
    examDate: toISODate(ctx.settings.examDate),
    weekdayHours: ctx.hoursArr,
    restWeekday: ctx.settings.restWeekday,
    minDailyMinutes: ctx.settings.minDailyMinutes,
    maxDailyMinutes: ctx.settings.maxDailyMinutes,
    gaDripMinutes: ctx.settings.gaDripMinutes,
    commitments: ctx.commitments.map((c) => ({ date: toISODate(c.date), minutes: c.minutes })),
    phases: ctx.phases.map((p) => ({
      slug: p.slug,
      startDate: toISODate(p.startDate),
      endDate: toISODate(p.endDate),
    })),
    topics: ctx.topics.map((t) => ({
      id: t.id,
      subjectId: t.subjectId,
      expectedMarks: t.subject.pyqAvgMarks ? t.subject.pyqAvgMarks / Math.max(ctx.topics.filter((x) => x.subjectId === t.subjectId).length, 1) : 4,
      frequency: t.pyqFrequency,
      inSyllabus2027: t.inSyllabus2027,
      phaseSlug: t.phaseSlug,
      isGa: t.subject.code === "GA",
    })),
    dependencies: ctx.deps.map((d) => ({ fromTopicId: d.fromTopicId, toTopicId: d.toTopicId })),
    tasks: ctx.tasks.map((t) => ({
      id: t.id,
      topicId: t.topicId,
      title: t.title,
      remainingMinutes: t.remainingMinutes,
      status: t.status,
      isGaDrip: t.isGaDrip,
      firstScheduledDate: firstDates.get(t.id) ?? (t.plannedDate ? toISODate(t.plannedDate) : null),
    })),
    completedTopicIds: ctx.completedTopicIds,
  });

  if (plan.length > 0) {
    await prisma.dailyPlanItem.createMany({
      data: plan.map((item) => ({
        taskId: item.taskId,
        date: toDateOnly(item.date),
        plannedMinutes: item.plannedMinutes,
      })),
    });
  }

  const newFirst = new Map<string, string>();
  for (const item of plan) {
    if (!newFirst.has(item.taskId)) newFirst.set(item.taskId, item.date);
  }
  for (const [taskId, date] of newFirst) {
    const existing = firstDates.get(taskId);
    if (!existing) {
      await prisma.studyTask.update({
        where: { id: taskId },
        data: { plannedDate: toDateOnly(date) },
      });
    }
  }

  return plan.length;
}

export async function getHoursBehind(today = todayISO()) {
  const remaining = await prisma.studyTask.findMany({
    select: { id: true, remainingMinutes: true },
  });
  const remainingByTask = new Map(remaining.map((t) => [t.id, t.remainingMinutes]));
  const past = await prisma.dailyPlanItem.findMany({
    where: { date: { lt: toDateOnly(today) } },
  });
  return hoursBehind(
    past.map((p) => ({ date: toISODate(p.date), taskId: p.taskId, plannedMinutes: p.plannedMinutes })),
    today,
    remainingByTask,
  );
}

export async function applyTaskProgress(
  itemId: string,
  status: TaskStatus,
  actualMinutes: number,
) {
  const item = await prisma.dailyPlanItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { task: true },
  });

  const countedActual = status === "SKIPPED" ? 0 : actualMinutes;
  await prisma.dailyPlanItem.update({
    where: { id: itemId },
    data: { status, actualMinutes: countedActual },
  });

  const other = await prisma.dailyPlanItem.aggregate({
    where: { taskId: item.taskId, NOT: { id: itemId } },
    _sum: { actualMinutes: true },
  });
  const doneMinutes = (other._sum.actualMinutes ?? 0) + countedActual;
  const remaining = Math.max(item.task.originalEstimatedMinutes - doneMinutes, 0);
  const taskStatus: TaskStatus =
    status === "SKIPPED" && remaining > 0
      ? "IN_PROGRESS"
      : remaining <= 0
        ? status === "SKIPPED"
          ? "SKIPPED"
          : "COMPLETED"
        : status === "COMPLETED"
          ? "PARTIALLY_COMPLETED"
          : status;

  await prisma.studyTask.update({
    where: { id: item.taskId },
    data: {
      remainingMinutes: remaining,
      status: taskStatus,
      actualCompletionDate: remaining <= 0 && taskStatus === "COMPLETED" ? new Date() : undefined,
    },
  });
}

export { addDaysISO };
