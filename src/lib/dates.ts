export function todayISO(timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function toDateOnly(value: string | Date): Date {
  const iso = typeof value === "string" ? value.slice(0, 10) : toISODate(value);
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const date = toDateOnly(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function weekdayUTC(iso: string): number {
  return toDateOnly(iso).getUTCDay();
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** Fixed 3-letter English. Intl en-IN can print "Sept" instead of "Sep". */
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatLongDate(iso: string): string {
  const date = toDateOnly(iso);
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const date = toDateOnly(iso);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/** Inclusive range, e.g. "8–10 Sep" or "30 Sep – 2 Oct". */
export function formatShortRange(start: string, end: string): string {
  if (start === end) return formatShortDate(start);
  const a = toDateOnly(start);
  const b = toDateOnly(end);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()}–${formatShortDate(end)}`;
  }
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function daysUntil(fromISO: string, toISO: string): number {
  return Math.max(0, signedDays(fromISO, toISO));
}

/** Positive when `toISO` is after `fromISO`. */
export function signedDays(fromISO: string, toISO: string): number {
  const from = toDateOnly(fromISO).getTime();
  const to = toDateOnly(toISO).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
