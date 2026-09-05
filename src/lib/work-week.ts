import { addDaysISO, weekdayUTC } from "@/lib/dates";
import { FIRST_PASS_DATE, START_DATE, STUDY_LOAD, chunkHours } from "@/lib/study-load";

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
  const hours = [...DEFAULT_HOURS_BY_DOW];
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

export function hourChips(todayHours: number) {
  const base = [0.5, 1, 2, 3, 4];
  if (todayHours >= 6) base.push(6);
  if (todayHours >= 8) base.push(8);
  return base;
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
}) {
  const hoursByDow = input.hoursByDow ?? [...DEFAULT_HOURS_BY_DOW];
  const deadline = input.deadline ?? FIRST_PASS_DATE;
  const startDate = input.startDate ?? START_DATE;
  const todayTarget = hoursByDow[weekdayUTC(input.today)] ?? WEEKDAY_STUDY_HOURS;
  const yesterday = addDaysISO(input.today, -1);
  const expectedDone = input.today <= startDate ? 0 : sumHours(startDate, yesterday, hoursByDow);
  const capacityLeft = sumHours(input.today, deadline, hoursByDow);
  const actualDone = Math.max(0, input.totalHours - input.remainingHours);
  const coreDone = Math.max(0, input.coreTotal - input.coreRemaining);
  const delayHours = Math.max(0, Math.round((expectedDone - actualDone) * 10) / 10);
  const aheadHours = Math.max(0, Math.round((actualDone - expectedDone) * 10) / 10);
  const todayLeft = Math.max(0, Math.round((todayTarget - input.loggedHours) * 10) / 10);
  const startMs = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const todayMs = new Date(`${input.today}T00:00:00.000Z`).getTime();
  const deadlineMs = new Date(`${deadline}T00:00:00.000Z`).getTime();

  return {
    daysLeft: Math.max(0, Math.round((deadlineMs - todayMs) / 86_400_000)),
    daysElapsed: Math.max(0, Math.round((todayMs - startMs) / 86_400_000)),
    todayTarget,
    todayLeft,
    weeklyHours: Math.round(hoursByDow.reduce((sum, hours) => sum + hours, 0) * 10) / 10,
    expectedDone: Math.round(expectedDone * 10) / 10,
    actualDone: Math.round(actualDone * 10) / 10,
    delayHours,
    aheadHours,
    capacityLeft,
    coreRemaining: Math.round(input.coreRemaining * 10) / 10,
    coreTotal: input.coreTotal,
    coreDone: Math.round(coreDone * 10) / 10,
    coreFits: input.coreRemaining <= capacityLeft + 0.05,
    isWeekend: weekdayUTC(input.today) === 0 || weekdayUTC(input.today) === 6,
  };
}
