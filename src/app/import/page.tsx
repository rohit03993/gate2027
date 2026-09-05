import { importPwCsvAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui";
import { isDatabaseUp } from "@/lib/db";
import { SetupNeeded } from "@/components/setup-needed";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const params = await searchParams;
  if (!(await isDatabaseUp())) return <SetupNeeded />;
  const lectures = await prisma.courseLecture.count();
  const dpps = await prisma.courseDpp.count();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">PW import</h1>
        <p className="text-sm text-muted">Upload a CSV of lectures. Do not type the batch by hand.</p>
      </div>
      <Panel>
        <p className="text-sm">
          Currently stored: {lectures} lectures, {dpps} DPPs.
        </p>
        {params.created ? (
          <p className="mt-2 text-sm text-good">Imported {params.created} lecture rows and rebuilt the plan.</p>
        ) : null}
        {params.error ? <p className="mt-2 text-sm text-bad">Upload a CSV file first.</p> : null}
        <p className="mt-2 text-sm text-muted">
          Columns: subject, chapter, lecture_number, lecture_title, duration_minutes, dpp_number
        </p>
        <form action={importPwCsvAction} className="mt-4 grid gap-3">
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <button className="w-fit rounded bg-accent px-4 py-2 text-sm font-medium text-white">Import and reschedule</button>
        </form>
      </Panel>
      <Panel>
        <h2 className="mb-2 font-semibold">Sample CSV</h2>
        <pre className="overflow-auto rounded bg-bg p-3 text-xs">
{`subject,chapter,lecture_number,lecture_title,duration_minutes,dpp_number
Programming and Data Structures,C Programming,6,Pointers advanced,55,6
Programming and Data Structures,C Programming,7,Structures,50,`}
        </pre>
      </Panel>
    </div>
  );
}
