"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { COMPARE_ROWS, PREP_RULES, useLabel, type CompareRow } from "@/lib/source-compare";
import { cn } from "@/lib/utils";

export function CompareBoard() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <header className="grid gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">PW · EduRev · GATE 2027</p>
        <h1 className="text-[1.65rem] font-semibold tracking-tight sm:text-3xl">What to use</h1>
        <p className="text-sm leading-relaxed text-muted">
          PW teaches. EduRev drills. Follow your C → DS → Algo order, not EduRev’s three months.
        </p>
      </header>

      <section className="rounded-3xl border border-line bg-bg-2 p-4 sm:p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">How to prepare</h2>
        <ol className="mt-3 grid gap-2.5">
          {PREP_RULES.map((rule, i) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3">
        {COMPARE_ROWS.map((row) => (
          <CompareCard key={row.gate} row={row} />
        ))}
      </div>

      <p className="text-sm text-muted">
        <Link href="/pyq" className="underline-offset-2 hover:underline">
          Log a PYQ
        </Link>
        {" · "}
        <Link href="/syllabus" className="underline-offset-2 hover:underline">
          GATE syllabus
        </Link>
      </p>
    </div>
  );
}

function CompareCard({ row }: { row: CompareRow }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-3xl border border-line bg-bg-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[4.5rem] w-full items-start gap-3 px-4 py-4 text-left active:bg-bg sm:px-5"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{row.gate}</span>
            <UsePill use={row.use} />
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed text-muted">{row.how}</span>
        </span>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <SourceBox label="Physics Wallah" text={row.pw} />
            <SourceBox label="EduRev" text={row.edurev} />
          </div>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">EduRev chapters</p>
          <ul className="mt-2 divide-y divide-line">
            {row.chapters.map((chapter) => (
              <li key={chapter.name} className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span className={cn("text-sm", chapter.skip && "text-muted line-through")}>{chapter.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {chapter.skip
                    ? "skip"
                    : [chapter.videos ? `${chapter.videos}v` : null, chapter.docs ? `${chapter.docs}d` : null, chapter.tests ? `${chapter.tests}t` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function SourceBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-bg px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function UsePill({ use }: { use: CompareRow["use"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        use === "pw" && "bg-accent-soft text-accent",
        use === "both" && "bg-accent-soft text-ink",
        use === "edurev" && "bg-bg text-ink",
        use === "drip" && "bg-bg text-muted",
        (use === "later" || use === "skip") && "bg-bg text-muted",
      )}
    >
      {useLabel(use)}
    </span>
  );
}
