"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, GitCompare, Home, Settings } from "lucide-react";
import { daysUntil, todayISO } from "@/lib/dates";
import { FIRST_PASS_DATE } from "@/lib/study-load";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today", icon: Home },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/progress", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <Link href="/" className="flex min-h-12 items-center gap-2.5 outline-none">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-[12px] font-bold tracking-tight text-accent">
        G27
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-ink">GATE CS</span>
        <span className="block text-[11px] text-muted">2027 · daily log</span>
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
      <header className="sticky top-0 z-20 border-b border-line/70 bg-bg-2 pt-[env(safe-area-inset-top)] md:bg-bg-2/90 md:backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
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
                    "rounded-full px-3.5 py-2 text-muted",
                    active && "bg-accent-soft font-medium text-ink",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <p className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold tabular-nums text-ink md:hidden">
            {daysLeft}d
          </p>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5 px-1 pt-1">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium text-muted active:bg-accent-soft/70",
                  active && "bg-accent-soft text-ink",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.75} />
                <span className="leading-none">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
