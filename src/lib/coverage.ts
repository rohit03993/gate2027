import type { StudyTask, Subtopic, TaskStatus } from "@prisma/client";

export const COVERAGE = [
  { key: "VIDEO", label: "Video", types: ["LECTURE"] },
  { key: "NOTES", label: "Notes", types: ["NOTES"] },
  { key: "MCQ", label: "MCQs", types: ["PRACTICE", "DPP"] },
  { key: "PYQ", label: "PYQs", types: ["PYQ"] },
  { key: "REVISE", label: "Revision", types: ["REVISION"] },
  { key: "TEST", label: "Test", types: ["SECTION_TEST"] },
] as const;

export type CoverageKey = (typeof COVERAGE)[number]["key"];

/** @deprecated Display days now use beginner hours. Kept for scheduler leftovers. */
const FOCUS_MINUTES = 240;

export function daysForMinutes(minutes: number, slot = FOCUS_MINUTES): number {
  if (minutes <= 0) return 0;
  return Math.max(1, Math.ceil(minutes / slot));
}

export function remainingMinutes(tasks: Pick<StudyTask, "status" | "remainingMinutes">[]): number {
  return tasks
    .filter((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED")
    .reduce((sum, t) => sum + t.remainingMinutes, 0);
}

export function coverageState(
  tasks: Pick<StudyTask, "taskType" | "status">[],
  types: readonly string[],
): { done: boolean; total: number; finished: number } {
  const list = tasks.filter((t) => types.includes(t.taskType));
  const finished = list.filter((t) => t.status === "COMPLETED").length;
  return {
    total: list.length,
    finished,
    done: list.length > 0 && finished === list.length,
  };
}

export function topicCoverage(tasks: Pick<StudyTask, "taskType" | "status">[]) {
  return COVERAGE.map((item) => ({
    ...item,
    ...coverageState(tasks, item.types),
  }));
}

export function coveragePercent(tasks: Pick<StudyTask, "taskType" | "status">[]): number {
  const rows = topicCoverage(tasks);
  const usable = rows.filter((r) => r.total > 0);
  if (usable.length === 0) return 0;
  const done = usable.filter((r) => r.done).length;
  return Math.round((done / usable.length) * 100);
}

export function subtopicPercent(subtopics: Pick<Subtopic, "completed">[]): number {
  if (subtopics.length === 0) return 0;
  return Math.round((subtopics.filter((s) => s.completed).length / subtopics.length) * 100);
}

export function weightageText(item: {
  officialFixedMarks?: number | null;
  pyqAvgMarks?: number | null;
  pyqRangeLow?: number | null;
  pyqRangeHigh?: number | null;
}): string {
  if (item.officialFixedMarks != null) return `${item.officialFixedMarks} marks (fixed)`;
  if (item.pyqRangeLow != null && item.pyqRangeHigh != null) {
    return `${item.pyqRangeLow}–${item.pyqRangeHigh} marks`;
  }
  if (item.pyqAvgMarks != null) return `~${item.pyqAvgMarks} marks in recent papers`;
  return "Marks vary by year";
}

export function doneStatus(percent: number): string {
  if (percent >= 100) return "Mastered";
  if (percent >= 70) return "Strong";
  if (percent >= 40) return "In progress";
  if (percent > 0) return "Started";
  return "Not started";
}

export function isComplete(status: TaskStatus) {
  return status === "COMPLETED";
}
