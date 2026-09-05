"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { daysUntil, todayISO } from "@/lib/dates";
import { FIRST_PASS_DATE } from "@/lib/study-load";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/compare", label: "Compare" },
  { href: "/progress", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2 outline-none">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-[11px] font-bold tracking-tight text-accent">
        G27
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-ink">GATE CS</span>
        <span className="block text-[10px] text-muted">2027</span>
      </span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const daysLeft = daysUntil(todayISO(), FIRST_PASS_DATE);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg-2 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2">
          <Brand />
          <nav className="hidden items-center gap-0.5 text-sm md:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-muted",
                    active && "bg-accent font-medium text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <p className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink md:hidden">
            {daysLeft}d
          </p>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-bg/95 pb-[env(safe-area-inset-bottom)] pt-1.5 md:hidden">
        <div className="mx-auto flex max-w-5xl gap-1 px-2">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full px-1 text-[11px] font-medium",
                  active ? "bg-accent text-white" : "bg-bg-2 text-muted",
                )}
              >
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
