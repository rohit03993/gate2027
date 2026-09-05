import { addDaysISO, formatShortRange, weekdayUTC } from "@/lib/dates";
import { DEFAULT_HOURS_BY_DOW, DRIP_CODES, HIGH_YIELD_ORDER, LATER_CODES, type HoursByDow } from "@/lib/work-week";

export type CalendarWindow = {
  start: string | null;
  end: string | null;
};

export type TopicWindow = CalendarWindow & {
  code: string;
  remainingHours: number;
  later: boolean;
};

/** Place `hours` of work on the 4h/8h calendar starting `fromISO` (inclusive). */
export function windowForHours(fromISO: string, hours: number, hoursByDow: HoursByDow): CalendarWindow {
  if (hours <= 0.05) return { start: null, end: null };
  let left = hours;
  let cursor = fromISO;
  let start: string | null = null;
  let guard = 0;
  while (left > 0.05 && guard < 900) {
    const cap = hoursByDow[weekdayUTC(cursor)] ?? 0;
    if (cap > 0) {
      if (!start) start = cursor;
      left -= cap;
    }
    if (left > 0.05) cursor = addDaysISO(cursor, 1);
    guard += 1;
  }
  return { start, end: start ? cursor : null };
}

export function scheduleTopicWindows(input: {
  today: string;
  hoursByDow?: HoursByDow;
  topics: { code: string; remainingHours: number }[];
}): { byCode: Map<string, TopicWindow>; core: CalendarWindow } {
  const hoursByDow = input.hoursByDow ?? [...DEFAULT_HOURS_BY_DOW];
  const remainingByCode = new Map(input.topics.map((topic) => [topic.code, topic.remainingHours]));
  const byCode = new Map<string, TopicWindow>();
  let cursor = input.today;

  function place(code: string, later: boolean) {
    const remainingHours = Math.round((remainingByCode.get(code) ?? 0) * 10) / 10;
    if (later) {
      byCode.set(code, { code, remainingHours, later: true, start: null, end: null });
      return;
    }
    if (remainingHours <= 0.05) {
      byCode.set(code, { code, remainingHours: 0, later: false, start: null, end: null });
      return;
    }
    const win = windowForHours(cursor, remainingHours, hoursByDow);
    byCode.set(code, { code, remainingHours, later: false, ...win });
    if (win.end) cursor = addDaysISO(win.end, 1);
  }

  for (const code of HIGH_YIELD_ORDER) {
    if (remainingByCode.has(code)) place(code, false);
  }

  for (const topic of input.topics) {
    if (byCode.has(topic.code)) continue;
    place(topic.code, LATER_CODES.has(topic.code) || DRIP_CODES.has(topic.code));
  }

  const coreRows = HIGH_YIELD_ORDER.map((code) => byCode.get(code)).filter(
    (row): row is TopicWindow => Boolean(row?.start && row.end),
  );
  return {
    byCode,
    core: {
      start: coreRows[0]?.start ?? null,
      end: coreRows.at(-1)?.end ?? null,
    },
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
  if (later) return "after core";
  if (!start || !end) return "done";
  return formatShortRange(start, end);
}
