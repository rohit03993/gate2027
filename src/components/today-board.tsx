"use client";

import { useState } from "react";
import { formatMinutes } from "@/lib/dates";
import { TASK_KIND, shortTaskTitle } from "@/lib/task-labels";

export type BoardTask = {
  id: string;
  title: string;
  kind: string;
  minutes: number;
  done: boolean;
};

export type BoardGroup = {
  name: string;
  minutes: number;
  tasks: BoardTask[];
};

export function TaskCheck({ task }: { task: BoardTask }) {
  const [done, setDone] = useState(task.done);
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-2 hover:bg-bg">
      <input type="hidden" name={`status-${task.id}`} value={done ? "COMPLETED" : "NOT_STARTED"} />
      <input type="hidden" name={`mins-${task.id}`} value={task.minutes} />
      <input
        type="checkbox"
        checked={done}
        onChange={() => setDone(!done)}
        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${done ? "text-muted line-through" : ""}`}>
          {shortTaskTitle(task.title)}
        </span>
        <span className="text-xs text-muted">
          {TASK_KIND[task.kind] ?? task.kind} · {formatMinutes(task.minutes)}
        </span>
      </span>
    </label>
  );
}

export function FinishDayFields() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        {open ? "Hide extra details" : "Add hours or PYQ notes (optional)"}
      </button>
      {open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Hours actually studied
            <input name="actualHours" type="number" min="0" step="0.5" className="rounded border border-line px-2 py-1.5" placeholder="Leave blank to use ticks" />
          </label>
          <label className="grid gap-1 text-sm">
            PYQs done / correct
            <span className="flex gap-2">
              <input name="pyqsDone" type="number" min="0" defaultValue={0} className="w-full rounded border border-line px-2 py-1.5" />
              <input name="pyqsCorrect" type="number" min="0" defaultValue={0} className="w-full rounded border border-line px-2 py-1.5" />
            </span>
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Anything difficult?
            <input name="difficultTopic" className="rounded border border-line px-2 py-1.5" />
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="pyqsDone" value="0" />
          <input type="hidden" name="pyqsCorrect" value="0" />
        </>
      )}
    </div>
  );
}
