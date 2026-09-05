import { prisma } from "@/lib/prisma";
import { logPyqAction } from "@/app/actions";
import { Panel } from "@/components/ui";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";

export const dynamic = "force-dynamic";

export default async function PyqPage() {
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  const [subjects, attempts] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { sortOrder: "asc" },
      include: { topics: { orderBy: { sortOrder: "asc" } }, section: true },
    }),
    prisma.pyqAttempt.findMany({
      include: { pyq: { include: { subject: true, topic: true } } },
      orderBy: { attemptedAt: "desc" },
      take: 50,
    }),
  ]);

  const bySubject = new Map<string, { n: number; correct: number }>();
  const byTopic = new Map<string, { n: number; correct: number; name: string }>();
  const allAttempts = await prisma.pyqAttempt.findMany({
    include: { pyq: { include: { subject: true, topic: true } } },
  });
  for (const a of allAttempts) {
    const s = bySubject.get(a.pyq.subject.name) ?? { n: 0, correct: 0 };
    s.n += 1;
    if (a.correct) s.correct += 1;
    bySubject.set(a.pyq.subject.name, s);
    if (a.pyq.topic) {
      const t = byTopic.get(a.pyq.topic.id) ?? { n: 0, correct: 0, name: a.pyq.topic.name };
      t.n += 1;
      if (a.correct) t.correct += 1;
      byTopic.set(a.pyq.topic.id, t);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">PYQ tracker</h1>
        <p className="text-sm text-muted">Log every attempt. Accuracy is by subject and topic, not by lectures watched.</p>
      </div>

      <Panel>
        <h2 className="mb-3 font-semibold">Log an attempt</h2>
        <form action={logPyqAction} className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Subject
            <select name="subjectId" required className="rounded border border-line px-2 py-1.5">
              {subjects.filter((s) => s.section.code !== "GA").map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Topic
            <select name="topicId" className="rounded border border-line px-2 py-1.5">
              <option value="">—</option>
              {subjects.flatMap((s) =>
                s.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {s.code}: {t.name}
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Year
            <input name="year" type="number" defaultValue={2025} className="rounded border border-line px-2 py-1.5" />
          </label>
          <label className="grid gap-1 text-sm">
            Paper / session
            <input name="paper" placeholder="Set 1" className="rounded border border-line px-2 py-1.5" />
          </label>
          <label className="grid gap-1 text-sm">
            Marks
            <select name="marks" defaultValue="2" className="rounded border border-line px-2 py-1.5">
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Type
            <select name="questionType" className="rounded border border-line px-2 py-1.5">
              <option>MCQ</option>
              <option>MSQ</option>
              <option>NAT</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Difficulty
            <select name="difficulty" defaultValue="MEDIUM" className="rounded border border-line px-2 py-1.5">
              <option>EASY</option>
              <option>MEDIUM</option>
              <option>HARD</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Correct?
            <select name="correct" className="rounded border border-line px-2 py-1.5">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Time (seconds)
            <input name="timeSeconds" type="number" min="0" className="rounded border border-line px-2 py-1.5" />
          </label>
          <label className="grid gap-1 text-sm">
            If wrong, reason
            <select name="mistakeType" className="rounded border border-line px-2 py-1.5">
              <option value="">—</option>
              <option value="CONCEPT">Conceptual</option>
              <option value="CALCULATION">Calculation</option>
              <option value="SILLY_MISTAKE">Silly mistake</option>
              <option value="TIME">Time</option>
              <option value="QUESTION_INTERPRETATION">Interpretation</option>
              <option value="GUESS">Guess</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-3">
            Notes
            <input name="notes" className="rounded border border-line px-2 py-1.5" />
          </label>
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white sm:col-span-3">Save attempt</button>
        </form>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">Subject accuracy</h2>
          {bySubject.size === 0 ? <p className="text-sm text-muted">No attempts yet.</p> : (
            <ul className="grid gap-2 text-sm">
              {[...bySubject.entries()].map(([name, v]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span>
                    {v.correct}/{v.n} ({Math.round((v.correct / v.n) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Topic accuracy</h2>
          {byTopic.size === 0 ? <p className="text-sm text-muted">No topic-tagged attempts yet.</p> : (
            <ul className="grid gap-2 text-sm">
              {[...byTopic.values()].map((v) => (
                <li key={v.name} className="flex justify-between gap-3">
                  <span>{v.name}</span>
                  <span>
                    {v.correct}/{v.n} ({Math.round((v.correct / v.n) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-3 font-semibold">Recent attempts</h2>
        <ul className="grid gap-2 text-sm">
          {attempts.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 border-b border-line pb-2">
              <span>
                {a.pyq.year} · {a.pyq.subject.name}
                {a.pyq.topic ? ` · ${a.pyq.topic.name}` : ""} · {a.pyq.marks}m
              </span>
              <span className={a.correct ? "text-good" : "text-bad"}>{a.correct ? "Correct" : a.mistakeType ?? "Wrong"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
