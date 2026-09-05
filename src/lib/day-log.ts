import type { StepKind } from "@/lib/study-load";

export const GA_DRIP_ID = "ga-drip";
export const GA_DRIP_HOURS = 0.4;

export type DayStudyItem = {
  chunkId: string;
  status: "done" | "started";
  hours: number;
  step?: StepKind | "ga";
};

const MARK = "\n<!--gate-study-log-->\n";

export function logKey(row: Pick<DayStudyItem, "chunkId" | "step">) {
  return `${row.chunkId}:${row.step ?? "chunk"}`;
}

export function upsertLog(log: DayStudyItem[], item: DayStudyItem) {
  return [...log.filter((row) => logKey(row) !== logKey(item)), item];
}

export function removeLog(log: DayStudyItem[], item: Pick<DayStudyItem, "chunkId" | "step">) {
  return log.filter((row) => logKey(row) !== logKey(item));
}

export function parseDayRecord(raw: string | null | undefined): { notes: string; log: DayStudyItem[] } {
  if (!raw) return { notes: "", log: [] };
  const at = raw.indexOf("<!--gate-study-log-->");
  if (at === -1) return { notes: raw, log: [] };
  const notes = raw.slice(0, at).replace(/\s+$/, "");
  const json = raw.slice(at + "<!--gate-study-log-->".length).trim();
  try {
    const parsed = JSON.parse(json) as DayStudyItem[];
    return { notes, log: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { notes, log: [] };
  }
}

export function joinDayRecord(notes: string, log: DayStudyItem[]): string {
  if (log.length === 0) return notes;
  return `${notes}${MARK}${JSON.stringify(log)}`;
}

export function logHours(log: DayStudyItem[]): number {
  return Math.round(log.reduce((sum, item) => sum + item.hours, 0) * 10) / 10;
}
