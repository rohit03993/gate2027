import { addDaysISO, signedDays, weekdayUTC } from "@/lib/dates";
import { EXAM_DATE, FIRST_PASS_DATE, START_DATE, STUDY_LOAD, chunkHours } from "@/lib/study-load";

/** Mon–Fri with a 10–7 office day. */
export const WEEKDAY_STUDY_HOURS = 4;
/** Saturday and Sunday catch-up. */
export const WEEKEND_STUDY_HOURS = 8;

/** Sunday=0 … Saturday=6, in focused hours. */
export const DEFAULT_HOURS_BY_DOW = [
  WEEKEND_STUDY_HOURS,
  WEEKDAY_STUDY_HOURS,
  WEEKDAY_STUDY_HOURS,
  WEEKDAY_STUDY_HOURS,
  WEEKDAY_STUDY_HOURS,
  WEEKDAY_STUDY_HOURS,
  WEEKEND_STUDY_HOURS,
] as const;

export const DEFAULT_MINUTES_BY_DOW = DEFAULT_HOURS_BY_DOW.map((hours) => hours * 60);

/** Previous seed (5–7h mix). Used only to migrate an untouched database. */
export const LEGACY_MINUTES_BY_DOW = [300, 360, 360, 420, 360, 360, 480];

export const WEEKLY_HOURS = DEFAULT_HOURS_BY_DOW.reduce((sum, hours) => sum + hours, 0);

/**
 * Finish these in order on office hours. GA is a daily drip inside the 4h, not a block.
 * Later subjects stay in the syllabus; they are not the 31 Dec clock.
 */
export const HIGH_YIELD_ORDER = [
  "PDS-C",
  "PDS-REC",
  "PDS-LINEAR",
  "PDS-LL",
  "PDS-TREES",
  "PDS-GRAPHS",
  "ALGO-ASYM",
  "ALGO-SORT",
  "ALGO-DESIGN",
  "ALGO-GRAPH",
  "DM-LOGIC",
  "DM-SETS",
  "DM-COMB",
  "DM-GRAPHS",
  "DM-ALGEBRA",
  "EM-PROB",
  "OS-PROC",
  "OS-SYNC",
  "OS-CPU",
  "OS-MEM",
  "OS-FS",
  "DB-ER",
  "DB-REL",
  "DB-NF",
  "DB-INDEX",
  "DB-TXN",
  "CN-LAYER",
  "CN-DLL",
  "CN-IP",
  "CN-TCP",
  "CN-ROUTE",
  "CN-APP",
] as const;

/** After core, still on the same 4h/8h calendar — this is pass 2. */
export const LATER_ORDER = [
  "DL-BOOL",
  "DL-CIRCUITS",
  "DL-ARITH",
  "COA-ISA",
  "COA-ALU",
  "COA-CU",
  "COA-CACHE",
  "COA-IO",
  "COA-PIPE",
  "TOC-FA",
  "TOC-CFG",
  "TOC-CFL",
  "TOC-TM",
  "CD-PARSE",
  "CD-RUNTIME",
  "CD-IR",
  "CD-OPT",
  "EM-LA",
  "EM-CALC",
] as const;

export const FULL_PASS_ORDER = [...HIGH_YIELD_ORDER, ...LATER_ORDER] as const;

export const DRIP_CODES = new Set(["GA-VERBAL", "GA-QUANT", "GA-ANALYTICAL", "GA-SPATIAL"]);

export const LATER_CODES = new Set([
  "DL-BOOL",
  "DL-CIRCUITS",
  "DL-ARITH",
  "COA-ISA",
  "COA-ALU",
  "COA-CU",
  "COA-CACHE",
  "COA-IO",
  "COA-PIPE",
  "TOC-FA",
  "TOC-CFG",
  "TOC-CFL",
  "TOC-TM",
  "CD-PARSE",
  "CD-RUNTIME",
  "CD-IR",
  "CD-OPT",
  "EM-LA",
  "EM-CALC",
  "GA-SPATIAL",
]);

export type HoursByDow = number[];

export function hoursFromMinutes(rows: { weekday: number; minutes: number }[]): HoursByDow {
  const hours: number[] = [...DEFAULT_HOURS_BY_DOW];
  for (const row of rows) {
    if (row.weekday >= 0 && row.weekday <= 6) hours[row.weekday] = row.minutes / 60;
  }
  return hours;
}

export function isCoreTopic(code: string) {
  return Boolean(STUDY_LOAD[code]) && !LATER_CODES.has(code) && !DRIP_CODES.has(code);
}

export function coreCatalogHours() {
  return Object.entries(STUDY_LOAD).reduce((sum, [code, chunks]) => {
    if (!isCoreTopic(code)) return sum;
    return sum + chunkHours(chunks);
  }, 0);
}

/** Core = 31 Dec clock. Later waits. GA drips inside the office day, not extra hours. */
export function catalogSplit() {
  let core = 0;
  let later = 0;
  let ga = 0;
  for (const [code, chunks] of Object.entries(STUDY_LOAD)) {
    const hours = chunkHours(chunks);
    if (DRIP_CODES.has(code)) ga += hours;
    else if (LATER_CODES.has(code)) later += hours;
    else core += hours;
  }
  return {
    core: Math.round(core * 10) / 10,
    later: Math.round(later * 10) / 10,
    ga: Math.round(ga * 10) / 10,
    all: Math.round((core + later + ga) * 10) / 10,
  };
}

export function sumHours(fromISO: string, toISO: string, hoursByDow: HoursByDow) {
  if (toISO < fromISO) return 0;
  let total = 0;
  let cursor = fromISO;
  while (cursor <= toISO) {
    total += hoursByDow[weekdayUTC(cursor)] ?? 0;
    cursor = addDaysISO(cursor, 1);
  }
  return Math.round(total * 10) / 10;
}

export function weekMonday(today: string) {
  const dow = weekdayUTC(today);
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDaysISO(today, offset);
}

function hours1(value: number) {
  return Math.round(value * 10) / 10;
}

/** Missed hours after `startDate` stack onto the next day. Days before the clock starts do not carry. */
export function weekCarry(
  days: { date: string; target: number; actual: number }[],
  startDate: string,
) {
  let debt = 0;
  return days.map((day) => {
    if (day.date < startDate) {
      return {
        carryIn: 0,
        carryOut: 0,
        shortfall: hours1(Math.max(0, day.target - day.actual)),
        clocked: false,
      };
    }
    const carryIn = hours1(debt);
    const carryOut = hours1(Math.max(0, day.target + carryIn - day.actual));
    debt = carryOut;
    return {
      carryIn,
      carryOut,
      shortfall: hours1(Math.max(0, day.target - day.actual)),
      clocked: true,
    };
  });
}

export function hourChips(todayHours: number) {
  const base = [0.5, 1, 2, 3, 4];
  if (todayHours >= 6) base.push(6);
  if (todayHours >= 8) base.push(8);
  return base;
}

export type CalendarWindow = {
  start: string | null;
  end: string | null;
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

function laterISO(a: string, b: string) {
  return a > b ? a : b;
}

/** Unpaid past days vs leftover future days, using the 4h/8h week. */
export function paceDays(input: {
  today: string;
  startDate: string;
  actualDone: number;
  hoursByDow: HoursByDow;
}): { delayDays: number; aheadDays: number } {
  if (input.today < input.startDate) return { delayDays: 0, aheadDays: 0 };
  let credit = input.actualDone;
  let delayDays = 0;
  let cursor = input.startDate;
  const yesterday = addDaysISO(input.today, -1);
  while (cursor <= yesterday) {
    const cap = input.hoursByDow[weekdayUTC(cursor)] ?? 0;
    if (cap > 0.05) {
      if (credit >= cap - 0.05) credit -= cap;
      else {
        delayDays += 1;
        credit = 0;
      }
    }
    cursor = addDaysISO(cursor, 1);
  }
  let aheadDays = 0;
  let extra = credit;
  const todayCap = input.hoursByDow[weekdayUTC(input.today)] ?? 0;
  if (todayCap > 0.05) {
    if (extra >= todayCap - 0.05) extra -= todayCap;
    else extra = 0;
  }
  cursor = addDaysISO(input.today, 1);
  let guard = 0;
  while (extra > 0.05 && guard < 400) {
    const cap = input.hoursByDow[weekdayUTC(cursor)] ?? 0;
    if (cap > 0.05) {
      extra -= cap;
      aheadDays += 1;
    }
    cursor = addDaysISO(cursor, 1);
    guard += 1;
  }
  return { delayDays, aheadDays };
}

export function workWeekPace(input: {
  today: string;
  remainingHours: number;
  totalHours: number;
  loggedHours: number;
  coreRemaining: number;
  coreTotal: number;
  hoursByDow?: HoursByDow;
  deadline?: string;
  startDate?: string;
  examDate?: string;
}) {
  const hoursByDow = input.hoursByDow ?? [...DEFAULT_HOURS_BY_DOW];
  const deadline = input.deadline ?? FIRST_PASS_DATE;
  const examDate = input.examDate ?? EXAM_DATE;
  const startDate = input.startDate ?? START_DATE;
  const todayTarget = hoursByDow[weekdayUTC(input.today)] ?? WEEKDAY_STUDY_HOURS;
  const yesterday = addDaysISO(input.today, -1);
  const started = input.today >= startDate;
  const expectedDone = started ? sumHours(startDate, yesterday, hoursByDow) : 0;
  const from = laterISO(input.today, startDate);
  const capacityLeft = sumHours(from, deadline, hoursByDow);
  const capacityToExam = sumHours(from, examDate, hoursByDow);
  const actualDone = Math.max(0, input.totalHours - input.remainingHours);
  const coreDone = Math.max(0, input.coreTotal - input.coreRemaining);
  const delayHours = Math.max(0, Math.round((expectedDone - actualDone) * 10) / 10);
  const aheadHours = Math.max(0, Math.round((actualDone - expectedDone) * 10) / 10);
  const { delayDays, aheadDays } = paceDays({
    today: input.today,
    startDate,
    actualDone,
    hoursByDow,
  });
  const todayLeft = Math.max(0, Math.round((todayTarget - input.loggedHours) * 10) / 10);
  const todayMs = new Date(`${input.today}T00:00:00.000Z`).getTime();
  const deadlineMs = new Date(`${deadline}T00:00:00.000Z`).getTime();
  const examMs = new Date(`${examDate}T00:00:00.000Z`).getTime();
  const coreProjectedFinish =
    input.coreRemaining <= 0.05
      ? started
        ? input.today
        : startDate
      : windowForHours(from, input.coreRemaining, hoursByDow).end;
  const projectedFinish =
    input.remainingHours <= 0.05
      ? started
        ? input.today
        : startDate
      : windowForHours(from, input.remainingHours, hoursByDow).end;
  const slipDays = coreProjectedFinish ? signedDays(deadline, coreProjectedFinish) : 0;
  const treeSlipDays = projectedFinish ? signedDays(examDate, projectedFinish) : 0;

  return {
    startDate,
    deadline,
    examDate,
    started,
    daysUntilStart: Math.max(0, signedDays(input.today, startDate)),
    daysLeft: Math.max(0, Math.round((deadlineMs - todayMs) / 86_400_000)),
    daysToExam: Math.max(0, Math.round((examMs - todayMs) / 86_400_000)),
    daysElapsed: started ? Math.max(0, signedDays(startDate, input.today)) : 0,
    todayTarget,
    todayLeft,
    weeklyHours: Math.round(hoursByDow.reduce((sum, hours) => sum + hours, 0) * 10) / 10,
    expectedDone: Math.round(expectedDone * 10) / 10,
    actualDone: Math.round(actualDone * 10) / 10,
    delayHours,
    aheadHours,
    delayDays,
    aheadDays,
    projectedFinish,
    coreProjectedFinish,
    slipDays,
    treeSlipDays,
    capacityLeft,
    capacityToExam,
    coreRemaining: Math.round(input.coreRemaining * 10) / 10,
    coreTotal: input.coreTotal,
    coreDone: Math.round(coreDone * 10) / 10,
    coreFits: input.coreRemaining <= capacityLeft + 0.05,
    treeFits: input.remainingHours <= capacityToExam + 0.05,
    treeRemaining: Math.round(input.remainingHours * 10) / 10,
    treeTotal: input.totalHours,
    treeDone: Math.round(actualDone * 10) / 10,
    isWeekend: weekdayUTC(input.today) === 0 || weekdayUTC(input.today) === 6,
  };
}
