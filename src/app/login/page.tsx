import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-sm items-center px-1">
      <div className="w-full rounded-3xl border border-line bg-bg-2 p-6 shadow-[0_12px_40px_rgba(15,118,110,0.08)]">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">G27</span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">GATE CS 2027</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Office-week log. 4h on workdays, 8h on weekends. Open Today and start with C.
        </p>
        {params.error ? <p className="mt-3 text-sm text-bad">Wrong password.</p> : null}
        <form action={loginAction} className="mt-5 grid gap-3">
          <input type="hidden" name="next" value={params.next || "/"} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="min-h-12 rounded-2xl border border-line bg-bg px-4 py-3 text-base"
          />
          <button
            type="submit"
            className="min-h-12 rounded-2xl bg-accent px-3 py-3 text-sm font-medium text-white"
          >
            Open Today
          </button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          After login on your phone: browser menu → Add to Home Screen.
        </p>
      </div>
    </div>
  );
}
