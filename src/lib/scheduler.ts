import { FREQUENCY_WEIGHT } from "./utils";

export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "SKIPPED";

export type SchedulerTask = {
  id: string;
  topicId: string | null;
  title: string;
  remainingMinutes: number;
  status: TaskStatus;
  isGaDrip: boolean;
  originalPlannedDate?: string | null;
  firstScheduledDate?: string | null;
};

export type SchedulerTopic = {
  id: string;
  subjectId: string;
  expectedMarks: number;
  frequency: keyof typeof FREQUENCY_WEIGHT;
  inSyllabus2027: boolean;
  phaseSlug?: string | null;
  isGa?: boolean;
};

export type SchedulerPhase = {
  slug: string;
  startDate: string;
  endDate: string;
};

export type SchedulerInput = {
  fromDate: string;
  examDate: string;
  weekdayHours: number[];
  restWeekday: number | null;
  minDailyMinutes: number;
  maxDailyMinutes: number;
  gaDripMinutes: number;
  commitments: { date: string; minutes: number }[];
  phases: SchedulerPhase[];
  topics: SchedulerTopic[];
  dependencies: { fromTopicId: string; toTopicId: string }[];
  tasks: SchedulerTask[];
  completedTopicIds: string[];
};

export type PlannedItem = {
  date: string;
  taskId: string;
  plannedMinutes: number;
};

export type DayCapacity = {
  date: string;
  availableMinutes: number;
};

function isoInRange(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

function weekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function dayCapacity(
  iso: string,
  input: Pick<
    SchedulerInput,
    "weekdayHours" | "restWeekday" | "minDailyMinutes" | "maxDailyMinutes" | "commitments"
  >,
): number {
  const dow = weekday(iso);
  if (input.restWeekday !== null && input.restWeekday === dow) return 0;
  const committed = input.commitments
    .filter((c) => c.date === iso)
    .reduce((sum, c) => sum + c.minutes, 0);
  const raw = (input.weekdayHours[dow] ?? 0) - committed;
  if (raw <= 0) return 0;
  return Math.min(input.maxDailyMinutes, Math.max(input.minDailyMinutes, raw));
}

function topicReady(
  topicId: string | null,
  deps: { fromTopicId: string; toTopicId: string }[],
  completedTopicIds: Set<string>,
): "preferred" | "soft" {
  if (!topicId) return "preferred";
  const prereqs = deps.filter((d) => d.toTopicId === topicId).map((d) => d.fromTopicId);
  if (prereqs.length === 0) return "preferred";
  const allDone = prereqs.every((id) => completedTopicIds.has(id));
  return allDone ? "preferred" : "soft";
}

function phaseForDate(iso: string, phases: SchedulerPhase[]): string | null {
  return phases.find((p) => isoInRange(iso, p.startDate, p.endDate))?.slug ?? null;
}

function scoreTask(
  task: SchedulerTask,
  topic: SchedulerTopic | undefined,
  iso: string,
  phases: SchedulerPhase[],
  ready: "preferred" | "soft",
  lastSubjectId: string | null,
): number {
  if (task.remainingMinutes <= 0) return -Infinity;
  const expected = topic?.expectedMarks ?? 4;
  const freq = FREQUENCY_WEIGHT[topic?.frequency ?? "STANDARD"];
  const readyBonus = ready === "preferred" ? 1.4 : 0.85;
  const leftoverBoost = task.firstScheduledDate && task.firstScheduledDate < iso ? 1.6 : 1;
  const hours = Math.max(task.remainingMinutes / 60, 0.4);
  const currentPhase = phaseForDate(iso, phases);
  const phaseBonus = topic?.phaseSlug && currentPhase === topic.phaseSlug ? 1.15 : 1;
  const rotationPenalty = topic && lastSubjectId && topic.subjectId === lastSubjectId ? 0.92 : 1;
  return ((expected * freq * readyBonus * leftoverBoost * phaseBonus * rotationPenalty) / hours);
}

export function generateSchedule(input: SchedulerInput): PlannedItem[] {
  const remaining = new Map(
    input.tasks
      .filter(
        (t) =>
          t.remainingMinutes > 0 &&
          t.status !== "COMPLETED" &&
          t.status !== "SKIPPED",
      )
      .map((t) => [t.id, { ...t }]),
  );
  const topics = new Map(input.topics.map((t) => [t.id, t]));
  const completed = new Set(input.completedTopicIds);
  const planned: PlannedItem[] = [];

  let cursor = input.fromDate;
  let lastSubjectId: string | null = null;

  while (cursor <= input.examDate) {
    let capacity = dayCapacity(cursor, input);
    if (capacity <= 0) {
      cursor = nextDay(cursor);
      continue;
    }

    const gaTasks = [...remaining.values()]
      .filter((t) => t.isGaDrip)
      .sort((a, b) => b.remainingMinutes - a.remainingMinutes);

    if (gaTasks.length > 0 && input.gaDripMinutes > 0) {
      const ga = gaTasks[0];
      const slice = Math.min(input.gaDripMinutes, ga.remainingMinutes, capacity);
      if (slice > 0) {
        planned.push({ date: cursor, taskId: ga.id, plannedMinutes: slice });
        ga.remainingMinutes -= slice;
        if (!ga.firstScheduledDate) ga.firstScheduledDate = cursor;
        capacity -= slice;
        if (ga.remainingMinutes <= 0) remaining.delete(ga.id);
      }
    }

    while (capacity > 0) {
      const dow = weekday(cursor);
      const weekend = dow === 0 || dow === 6;
      const candidates = [...remaining.values()].filter((t) => {
        if (t.isGaDrip) return false;
        const topic = t.topicId ? topics.get(t.topicId) : undefined;
        if (topic?.isGa && !weekend) return false;
        return true;
      });
      if (candidates.length === 0) break;

      let best: SchedulerTask | null = null;
      let bestScore = -Infinity;
      for (const task of candidates) {
        const topic = task.topicId ? topics.get(task.topicId) : undefined;
        if (topic && !topic.inSyllabus2027) continue;
        const ready = topicReady(task.topicId, input.dependencies, completed);
        const s = scoreTask(task, topic, cursor, input.phases, ready, lastSubjectId);
        if (s > bestScore) {
          bestScore = s;
          best = task;
        }
      }
      if (!best || bestScore === -Infinity) break;

      const slice = Math.min(best.remainingMinutes, capacity);
      planned.push({ date: cursor, taskId: best.id, plannedMinutes: slice });
      best.remainingMinutes -= slice;
      if (!best.firstScheduledDate) best.firstScheduledDate = cursor;
      capacity -= slice;
      const topic = best.topicId ? topics.get(best.topicId) : undefined;
      lastSubjectId = topic?.subjectId ?? lastSubjectId;
      if (best.remainingMinutes <= 0) remaining.delete(best.id);
    }

    cursor = nextDay(cursor);
  }

  return planned;
}

export function hoursBehind(items: PlannedItem[], today: string, remainingByTask: Map<string, number>): number {
  const slipped = items.filter((i) => i.date < today);
  let behind = 0;
  for (const item of slipped) {
    const rem = remainingByTask.get(item.taskId) ?? 0;
    if (rem > 0) behind += Math.min(item.plannedMinutes, rem);
  }
  return behind;
}
