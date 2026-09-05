export function SetupNeeded() {
  return (
    <section className="rounded-lg border border-line bg-bg-2 p-6">
      <h1 className="text-xl font-semibold">Database file is not ready yet</h1>
      <p className="mt-2 text-sm text-muted">
        This app uses a local SQLite file (no Docker). From the project folder run:
      </p>
      <pre className="mt-4 overflow-auto rounded bg-bg p-3 text-sm">
{`npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev`}
      </pre>
      <p className="mt-3 text-sm text-muted">Then log in with APP_PASSWORD from .env (default gate65).</p>
    </section>
  );
}
