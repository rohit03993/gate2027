import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { saveSettingsAction, regenerateAction, logoutAction } from "@/app/actions";
import { ResetProgressButton } from "@/components/reset-progress";
import { toISODate } from "@/lib/dates";
import { Panel } from "@/components/ui";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SettingsPage() {
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  const settings = await prisma.settings.findFirst();
  const hours = await prisma.weekdayHours.findMany({ orderBy: { weekday: "asc" } });
  const hourMap = new Map(hours.map((h) => [h.weekday, h.minutes]));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">
          Office week: 4h Mon–Fri, 8h Sat–Sun (36h). Clock starts 7 Sep 2026. First pass line is 31 Dec for core
          subjects. Exam date is the mock window after that.
        </p>
      </div>

      {!settings ? (
        <Panel>Database is empty. Run the seed after Postgres is up.</Panel>
      ) : (
        <form action={saveSettingsAction} className="grid gap-5">
          <Panel>
            <h2 className="mb-3 font-semibold">Exam</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                First pass deadline
                <input name="firstPassDeadline" type="date" defaultValue={toISODate(settings.firstPassDeadline)} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Exam date
                <input name="examDate" type="date" defaultValue={toISODate(settings.examDate)} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Target
                <input name="targetMarks" type="number" defaultValue={settings.targetMarks} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Preferred window
                <input name="preferredWindow" defaultValue={settings.preferredWindow ?? ""} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold">Daily capacity (hours)</h2>
            <p className="mb-3 text-sm text-muted">
              Defaults match a 10–7 job. Weekday 4h = morning lecture + night questions. Weekend 8h = catch-up. Min/max
              cap the old planner; weekday boxes are what Today uses.
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              {DAYS.map((name, d) => (
                <label key={name} className="grid gap-1 text-sm">
                  {name}
                  <input
                    name={`hours-${d}`}
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={(hourMap.get(d) ?? 0) / 60}
                    className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2"
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm">
                Rest weekday
                <select name="restWeekday" defaultValue={settings.restWeekday ?? ""} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2">
                  <option value="">None</option>
                  {DAYS.map((name, d) => (
                    <option key={name} value={d}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Min minutes
                <input name="minDailyMinutes" type="number" defaultValue={settings.minDailyMinutes} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Max minutes
                <input name="maxDailyMinutes" type="number" defaultValue={settings.maxDailyMinutes} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                GA drip (minutes)
                <input name="gaDripMinutes" type="number" defaultValue={settings.gaDripMinutes} className="min-h-12 rounded-2xl border border-line bg-bg px-3 py-2" />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted">Min/max fields are in minutes. Weekday fields are in hours.</p>
          </Panel>
          <button className="min-h-12 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white active:opacity-90">Save hours</button>
        </form>
      )}

      <form action={regenerateAction}>
        <button className="min-h-12 rounded-2xl border border-line px-4 py-2 text-sm active:bg-bg">Regenerate from today</button>
      </form>
      <Panel>
        <h2 className="mb-2 font-semibold">Reset progress</h2>
        <p className="mb-3 text-sm text-muted">
          Wipes Lecture / DPP / Test ticks, daily hour logs, and PYQ attempts. Does not reseed and does not change
          settings or the 4h/8h week.
        </p>
        <ResetProgressButton />
      </Panel>
      <p className="text-sm text-muted">
        Phone: open this site in Chrome or Safari, then Add to Home Screen. Use HTTPS on the server. Log in once; the
        session lasts 120 days.
      </p>
      <p className="text-sm">
        <Link href="/compare" className="text-muted underline-offset-2 hover:underline">
          PW vs EduRev
        </Link>
        {" · "}
        <Link href="/import" className="text-muted underline-offset-2 hover:underline">
          Import PW lectures (CSV)
        </Link>
        {" · "}
        <Link href="/pyq" className="text-muted underline-offset-2 hover:underline">
          PYQs
        </Link>
      </p>
      <form action={logoutAction}>
        <button className="min-h-12 text-sm text-muted">Log out</button>
      </form>
    </div>
  );
}
