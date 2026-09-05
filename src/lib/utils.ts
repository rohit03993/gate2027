import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FREQUENCY_WEIGHT = {
  HIGH: 1.35,
  MEDIUM: 1.1,
  STANDARD: 1,
} as const;

export const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  PARTIALLY_COMPLETED: "Partial",
  SKIPPED: "Skipped",
};

export function subjectStatus(breakdown: {
  lecture: number;
  practice: number;
  pyq: number;
  revision: number;
}): "Not started" | "Learning" | "Practicing" | "PYQ stage" | "Revised" {
  if (breakdown.revision >= 80 && breakdown.pyq >= 70) return "Revised";
  if (breakdown.pyq >= 40) return "PYQ stage";
  if (breakdown.practice >= 40 || breakdown.lecture >= 80) return "Practicing";
  if (breakdown.lecture > 0) return "Learning";
  return "Not started";
}
