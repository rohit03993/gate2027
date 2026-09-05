export const TASK_KIND: Record<string, string> = {
  LECTURE: "Watch",
  NOTES: "Notes",
  DPP: "DPP",
  PRACTICE: "Practice",
  PYQ: "Questions",
  REVISION: "Revise",
  SECTION_TEST: "Test",
};

export function shortTaskTitle(title: string): string {
  return title
    .replace(/^PW Lecture \d+:\s*/i, "")
    .replace(/^(GA drill|Notes|Lecture|Practice|PYQs|DPP \d+)\s+[—-]\s*/i, "")
    .trim();
}
