import { addDaysISO, formatShortRange } from "@/lib/dates";
import { START_DATE } from "@/lib/study-load";
import {
  DEFAULT_HOURS_BY_DOW,
  DRIP_CODES,
  FULL_PASS_ORDER,
  HIGH_YIELD_ORDER,
  LATER_CODES,
  windowForHours,
  type HoursByDow,
  type CalendarWindow,
} from "@/lib/work-week";

export type { CalendarWindow };
export { windowForHours };

export type TopicWindow = CalendarWindow & {
  code: string;
  remainingHours: number;
  later: boolean;
};

export function scheduleTopicWindows(input: {
  today: string;
  hoursByDow?: HoursByDow;
  topics: { code: string; remainingHours: number }[];
  startDate?: string;
}): { byCode: Map<string, TopicWindow>; core: CalendarWindow; tree: CalendarWindow } {
  const hoursByDow = input.hoursByDow ?? [...DEFAULT_HOURS_BY_DOW];
  const remainingByCode = new Map(input.topics.map((topic) => [topic.code, topic.remainingHours]));
  const byCode = new Map<string, TopicWindow>();
  const startDate = input.startDate ?? START_DATE;
  let cursor = input.today > startDate ? input.today : startDate;

  function place(code: string, later: boolean) {
    const remainingHours = Math.round((remainingByCode.get(code) ?? 0) * 10) / 10;
    if (DRIP_CODES.has(code)) {
      byCode.set(code, { code, remainingHours, later: true, start: null, end: null });
      return;
    }
    if (remainingHours <= 0.05) {
      byCode.set(code, { code, remainingHours: 0, later, start: null, end: null });
      return;
    }
    const win = windowForHours(cursor, remainingHours, hoursByDow);
    byCode.set(code, { code, remainingHours, later, ...win });
    if (win.end) cursor = addDaysISO(win.end, 1);
  }

  for (const code of FULL_PASS_ORDER) {
    if (remainingByCode.has(code)) place(code, LATER_CODES.has(code));
  }

  for (const topic of input.topics) {
    if (byCode.has(topic.code)) continue;
    place(topic.code, LATER_CODES.has(topic.code) || DRIP_CODES.has(topic.code));
  }

  function span(codes: readonly string[]): CalendarWindow {
    const rows = codes
      .map((code) => byCode.get(code))
      .filter((row): row is TopicWindow => Boolean(row?.start && row.end));
    return {
      start: rows[0]?.start ?? null,
      end: rows.at(-1)?.end ?? null,
    };
  }

  return {
    byCode,
    core: span(HIGH_YIELD_ORDER),
    tree: span(FULL_PASS_ORDER),
  };
}

export function sectionWindow(codes: string[], byCode: Map<string, TopicWindow>): CalendarWindow & { later: boolean } {
  const rows = codes.map((code) => byCode.get(code)).filter((row): row is TopicWindow => Boolean(row));
  if (rows.length === 0) return { start: null, end: null, later: false };
  if (rows.every((row) => row.later || row.remainingHours <= 0.05) && rows.some((row) => row.later && row.remainingHours > 0.05)) {
    return { start: null, end: null, later: true };
  }
  const open = rows.filter((row) => row.start && row.end);
  if (open.length === 0) {
    const leftover = rows.some((row) => row.later && row.remainingHours > 0.05);
    return { start: null, end: null, later: leftover };
  }
  const starts = open.map((row) => row.start as string);
  const ends = open.map((row) => row.end as string);
  return {
    start: starts.reduce((a, b) => (a < b ? a : b)),
    end: ends.reduce((a, b) => (a > b ? a : b)),
    later: false,
  };
}

export function formatWindow(start: string | null, end: string | null, later?: boolean): string {
  if (start && end) return formatShortRange(start, end);
  if (later) return "after core";
  return "done";
}
