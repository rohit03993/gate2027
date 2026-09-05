"use client";

import { resetStudyProgressAction } from "@/app/actions";

export function ResetProgressButton() {
  return (
    <form
      action={resetStudyProgressAction}
      onSubmit={(event) => {
        if (!window.confirm("Clear all ticks, day logs, and hours? The syllabus and office-week hours stay.")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="min-h-12 rounded-2xl border border-line px-4 py-2 text-sm text-bad active:bg-bg"
      >
        Reset study progress
      </button>
    </form>
  );
}
