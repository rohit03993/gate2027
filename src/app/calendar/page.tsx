import Link from "next/link";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { addDaysISO, daysInMonth, formatMinutes, toISODate, todayISO, weekdayUTC } from "@/lib/dates";
import { Panel } from "@/components/ui";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const params = await searchParams;
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  const today = todayISO();
  const monthISO = params.month || today.slice(0, 7);
  const [year, month] = monthISO.split("-").map(Number);
  const view = params.view === "month" ? "month" : "week";

  const start = `${monthISO}-01`;
  const dim = daysInMonth(year, month - 1);
  const end = `${monthISO}-${String(dim).padStart(2, "0")}`;

  const mondayOffset = (weekdayUTC(today) + 6) % 7;
  const monday = addDaysISO(today, -mondayOffset);
  const sunday = addDaysISO(monday, 6);

  const rangeStart = view === "week" ? monday : start;
  const rangeEnd = view === "week" ? sunday : end;

  const items = await prisma.dailyPlanItem.findMany({
    where: {
      date: {
        gte: new Date(`${rangeStart}T00:00:00.000Z`),
        lte: new Date(`${rangeEnd}T00:00:00.000Z`),
      },
    },
    include: { task: { include: { topic: { include: { subject: true } } } } },
  });
  const sessions = await prisma.studySession.findMany({
    where: {
      date: {
        gte: new Date(`${rangeStart}T00:00:00.000Z`),
        lte: new Date(`${rangeEnd}T00:00:00.000Z`),
      },
    },
  });
  const sessionMap = new Map(sessions.map((s) => [toISODate(s.date), s]));

  const byDate = new Map<string, typeof items>();
  for (const item of items) {
    const key = toISODate(item.date);
    byDate.set(key, [...(byDate.get(key) ?? []), item]);
  }

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">This week</h1>
          <p className="text-sm text-muted">Hours and subjects at a glance. Click a day to open it.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link className="rounded border border-line px-3 py-1.5" href={`/calendar?view=${view}&month=${prevMonth}`}>
            Prev
          </Link>
          <Link className="rounded border border-line px-3 py-1.5" href={`/calendar?view=month&month=${monthISO}`}>
            Month
          </Link>
          <Link className="rounded border border-line px-3 py-1.5" href="/calendar?view=week">
            Week
          </Link>
          <Link className="rounded border border-line px-3 py-1.5" href={`/calendar?view=${view}&month=${nextMonth}`}>
            Next
          </Link>
        </div>
      </div>

      {view === "week" ? (
        <WeekView monday={monday} byDate={byDate} sessionMap={sessionMap} />
      ) : (
        <MonthView year={year} month={month} dim={dim} byDate={byDate} sessionMap={sessionMap} today={today} />
      )}
    </div>
  );
}

function codesFor(items: { task: { topic: { subject: { code: string } } | null } }[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const code = item.task.topic?.subject.code ?? "GA";
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
}

function MonthView({
  year,
  month,
  dim,
  byDate,
  sessionMap,
  today,
}: {
  year: number;
  month: number;
  dim: number;
  byDate: Map<string, { plannedMinutes: number; actualMinutes: number; status: string; task: { topic: { subject: { code: string } } | null } }[]>;
  sessionMap: Map<string, { actualMinutes: number }>;
  today: string;
}) {
  const firstDow = weekdayUTC(`${year}-${String(month).padStart(2, "0")}-01`);
  const cells: (string | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= dim; d++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  return (
    <div className="grid grid-cols-7 gap-1 text-sm">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="px-2 py-1 text-xs uppercase text-muted">
          {d}
        </div>
      ))}
      {cells.map((iso, i) => {
        if (!iso) return <div key={`e-${i}`} />;
        const dayItems = byDate.get(iso) ?? [];
        const planned = dayItems.reduce((s, it) => s + it.plannedMinutes, 0);
        const actual = sessionMap.get(iso)?.actualMinutes ?? dayItems.reduce((s, it) => s + it.actualMinutes, 0);
        const done = dayItems.filter((it) => it.status === "COMPLETED").length;
        const pct = dayItems.length ? Math.round((done / dayItems.length) * 100) : 0;
        return (
          <Link
            key={iso}
            href={`/?date=${iso}`}
            className={`min-h-24 rounded border border-line bg-bg-2 p-2 ${iso === today ? "border-accent" : ""}`}
          >
            <div className="flex justify-between text-xs">
              <span>{Number(iso.slice(8))}</span>
              <span className="text-muted">{planned ? formatMinutes(planned) : ""}</span>
            </div>
            <div className="mt-1 text-xs font-medium">{codesFor(dayItems).join(" ")}</div>
            {dayItems.length ? <div className="mt-1 text-xs text-muted">{pct}% · {actual ? formatMinutes(actual) : "—"}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}

function WeekView({
  monday,
  byDate,
  sessionMap,
}: {
  monday: string;
  byDate: Map<string, { plannedMinutes: number; actualMinutes: number; status: string; task: { topic: { subject: { code: string; name: string } } | null } }[]>;
  sessionMap: Map<string, { actualMinutes: number }>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  let weekPlanned = 0;
  let weekActual = 0;
  const subjectMins = new Map<string, { planned: number }>();

  for (const iso of days) {
    const dayItems = byDate.get(iso) ?? [];
    weekPlanned += dayItems.reduce((s, it) => s + it.plannedMinutes, 0);
    weekActual += sessionMap.get(iso)?.actualMinutes ?? dayItems.reduce((s, it) => s + it.actualMinutes, 0);
    for (const it of dayItems) {
      const name = it.task.topic?.subject.name ?? "GA";
      subjectMins.set(name, { planned: (subjectMins.get(name)?.planned ?? 0) + it.plannedMinutes });
    }
  }
  const max = Math.max(...[...subjectMins.values()].map((v) => v.planned), 1);

  return (
    <div className="grid gap-4">
      <Panel>
        <div className="text-sm">
          This week · target {formatMinutes(weekPlanned)} · actual {formatMinutes(weekActual)}
        </div>
        <div className="mt-4 grid gap-2">
          {[...subjectMins.entries()].map(([name, v]) => (
            <div key={name} className="grid grid-cols-[10rem_1fr_4rem] items-center gap-2 text-sm">
              <span>{name}</span>
              <div className="h-2 overflow-hidden rounded bg-line">
                <div className="h-full bg-accent" style={{ width: `${(v.planned / max) * 100}%` }} />
              </div>
              <span className="text-right text-muted">{formatMinutes(v.planned)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-2 md:grid-cols-7">
        {days.map((iso) => {
          const dayItems = byDate.get(iso) ?? [];
          return (
            <Link key={iso} href={`/?date=${iso}`} className="rounded border border-line bg-bg-2 p-3 text-sm">
              <div className="font-medium">{iso.slice(8)}</div>
              <div className="text-xs text-muted">{formatMinutes(dayItems.reduce((s, i) => s + i.plannedMinutes, 0))}</div>
              <div className="mt-2 text-xs">{codesFor(dayItems).join(" · ")}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
