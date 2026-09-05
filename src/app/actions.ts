"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MistakeType, QuestionType, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyTaskProgress, regenerateFrom } from "@/lib/plan-engine";
import { addDaysISO, toDateOnly, todayISO, weekdayUTC } from "@/lib/dates";
import { joinDayRecord, type DayStudyItem } from "@/lib/day-log";
import type { StepKind } from "@/lib/study-load";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (password !== process.env.APP_PASSWORD) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const jar = await cookies();
  jar.set("gate_auth", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
  redirect(next || "/");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete("gate_auth");
  redirect("/login");
}

export async function updatePlanItemAction(formData: FormData) {
  const id = String(formData.get("itemId"));
  const status = String(formData.get("status")) as TaskStatus;
  const actualMinutes = Number(formData.get("actualMinutes") || 0);
  await applyTaskProgress(id, status, actualMinutes);
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function finishDayAction(formData: FormData) {
  const date = String(formData.get("date") || todayISO());
  const pyqsDone = Number(formData.get("pyqsDone") || 0);
  const pyqsCorrect = Number(formData.get("pyqsCorrect") || 0);
  const difficultTopic = String(formData.get("difficultTopic") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  const items = await prisma.dailyPlanItem.findMany({ where: { date: toDateOnly(date) } });
  const plannedMinutes = items.reduce((sum, i) => sum + i.plannedMinutes, 0);
  let loggedMinutes = 0;

  for (const item of items) {
    const status = String(formData.get(`status-${item.id}`) || item.status) as TaskStatus;
    const mins = Number(formData.get(`mins-${item.id}`) || 0);
    if (status === "COMPLETED" || status === "PARTIALLY_COMPLETED") loggedMinutes += mins || item.plannedMinutes;
    await applyTaskProgress(item.id, status, mins || (status === "COMPLETED" ? item.plannedMinutes : 0));
  }

  const typedHours = Number(formData.get("actualHours") || 0);
  const actualMinutes = typedHours > 0 ? Math.round(typedHours * 60) : loggedMinutes || plannedMinutes;

  await prisma.studySession.upsert({
    where: { date: toDateOnly(date) },
    update: {
      plannedMinutes,
      actualMinutes,
      pyqsDone,
      pyqsCorrect,
      difficultTopic,
      notes,
      finishedAt: new Date(),
    },
    create: {
      date: toDateOnly(date),
      plannedMinutes,
      actualMinutes,
      pyqsDone,
      pyqsCorrect,
      difficultTopic,
      notes,
      finishedAt: new Date(),
    },
  });

  await regenerateFrom(addDaysISO(date, 1));
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/progress");
  redirect(`/?finished=1`);
}

export async function regenerateAction() {
  await regenerateFrom(todayISO());
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function saveSettingsAction(formData: FormData) {
  const settings = await prisma.settings.findFirstOrThrow();
  await prisma.settings.update({
    where: { id: settings.id },
    data: {
      examDate: toDateOnly(String(formData.get("examDate"))),
      firstPassDeadline: formData.get("firstPassDeadline")
        ? toDateOnly(String(formData.get("firstPassDeadline")))
        : settings.firstPassDeadline,
      targetMarks: Number(formData.get("targetMarks") || 100),
      minDailyMinutes: Number(formData.get("minDailyMinutes") || 180),
      maxDailyMinutes: Number(formData.get("maxDailyMinutes") || 600),
      restWeekday: formData.get("restWeekday") === "" ? null : Number(formData.get("restWeekday")),
      gaDripMinutes: Number(formData.get("gaDripMinutes") || 25),
      preferredWindow: String(formData.get("preferredWindow") || "") || null,
    },
  });

  for (let d = 0; d <= 6; d++) {
    const minutes = Number(formData.get(`hours-${d}`) || 0) * 60;
    await prisma.weekdayHours.upsert({
      where: { weekday: d },
      update: { minutes },
      create: { weekday: d, minutes },
    });
  }

  await regenerateFrom(todayISO());
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/calendar");
}

export async function logPyqAction(formData: FormData) {
  const subjectId = String(formData.get("subjectId"));
  const topicId = String(formData.get("topicId") || "") || null;
  const year = Number(formData.get("year"));
  const marks = Number(formData.get("marks") || 2);
  const questionType = String(formData.get("questionType") || "MCQ") as QuestionType;
  const difficulty = String(formData.get("difficulty") || "MEDIUM");
  const paper = String(formData.get("paper") || "") || null;
  const prompt = String(formData.get("prompt") || "") || null;
  const correct = String(formData.get("correct")) === "yes";
  const timeSeconds = formData.get("timeSeconds") ? Number(formData.get("timeSeconds")) : null;
  const mistakeType = (!correct && formData.get("mistakeType")) ? String(formData.get("mistakeType")) as MistakeType : null;
  const notes = String(formData.get("notes") || "") || null;

  const pyq = await prisma.pyq.create({
    data: {
      year,
      paper,
      subjectId,
      topicId,
      marks,
      questionType,
      difficulty,
      prompt,
    },
  });
  await prisma.pyqAttempt.create({
    data: {
      pyqId: pyq.id,
      correct,
      timeSeconds,
      mistakeType,
      notes,
    },
  });
  revalidatePath("/pyq");
  revalidatePath("/progress");
}

export async function importPwCsvAction(formData: FormData) {
  const Papa = (await import("papaparse")).default;
  const file = formData.get("file") as File | null;
  if (!file) {
    redirect("/import?error=nofile");
  }
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const source = await prisma.courseSource.upsert({
    where: { name: "Physics Wallah" },
    update: {},
    create: { name: "Physics Wallah" },
  });

  let created = 0;
  for (const row of parsed.data) {
    const subjectName = row.subject?.trim();
    const chapter = row.chapter?.trim();
    const title = row.lecture_title?.trim();
    const lectureNumber = Number(row.lecture_number);
    const durationMinutes = Number(row.duration_minutes || 45);
    if (!subjectName || !chapter || !title || !lectureNumber) continue;

    const topic = await prisma.topic.findFirst({
      where: {
        OR: [
          { name: { contains: chapter } },
          { subject: { name: { contains: subjectName } } },
        ],
      },
    });

    const lecture = await prisma.courseLecture.create({
      data: {
        sourceId: source.id,
        topicId: topic?.id,
        subjectName,
        chapter,
        lectureNumber,
        title,
        durationMinutes,
      },
    });
    await prisma.studyTask.create({
      data: {
        topicId: topic?.id,
        lectureId: lecture.id,
        taskType: "LECTURE",
        title: `PW Lecture ${lectureNumber}: ${title}`,
        estimatedMinutes: durationMinutes,
        remainingMinutes: durationMinutes,
        originalEstimatedMinutes: durationMinutes,
        source: "PW",
        lectureReference: `L${lectureNumber}`,
      },
    });

    const dppNumber = row.dpp_number ? Number(row.dpp_number) : null;
    if (dppNumber) {
      const dpp = await prisma.courseDpp.create({
        data: {
          sourceId: source.id,
          topicId: topic?.id,
          subjectName,
          chapter,
          dppNumber,
          title: `DPP ${dppNumber}`,
        },
      });
      await prisma.studyTask.create({
        data: {
          topicId: topic?.id,
          dppId: dpp.id,
          taskType: "DPP",
          title: `DPP ${dppNumber} — ${chapter}`,
          estimatedMinutes: 40,
          remainingMinutes: 40,
          originalEstimatedMinutes: 40,
          source: "PW",
        },
      });
    }
    created += 1;
  }

  await regenerateFrom(todayISO());
  revalidatePath("/");
  revalidatePath("/import");
  redirect(`/import?created=${created}`);
}

export async function setStepDoneAction(id: string, step: StepKind, done: boolean) {
  const sub = await prisma.subtopic.findUniqueOrThrow({ where: { id } });
  const lectureDone = step === "lecture" ? done : sub.lectureDone;
  const dppDone = step === "dpp" ? done : sub.dppDone;
  const testDone = step === "test" ? done : sub.testDone;
  await prisma.subtopic.update({
    where: { id },
    data: {
      lectureDone,
      dppDone,
      testDone,
      completed: lectureDone && dppDone && testDone,
    },
  });
}

export async function setChunkCompletedAction(id: string, completed: boolean) {
  await prisma.subtopic.update({
    where: { id },
    data: {
      completed,
      lectureDone: completed,
      dppDone: completed,
      testDone: completed,
    },
  });
}

export async function saveDayLogAction(notes: string, hours: number, log: DayStudyItem[] = []) {
  const date = todayISO();
  const actualMinutes = Math.max(0, Math.round(hours * 60));
  const packed = joinDayRecord(notes, log);
  const dow = weekdayUTC(date);
  const cap = await prisma.weekdayHours.findUnique({ where: { weekday: dow } });
  const plannedMinutes = cap?.minutes ?? 240;
  await prisma.studySession.upsert({
    where: { date: toDateOnly(date) },
    update: { notes: packed || null, actualMinutes, plannedMinutes },
    create: {
      date: toDateOnly(date),
      notes: packed || null,
      actualMinutes,
      plannedMinutes,
    },
  });
}

export async function startTopicAction(formData: FormData) {
  const topicId = String(formData.get("topicId"));
  const settings = await prisma.settings.findFirstOrThrow();
  await prisma.settings.update({
    where: { id: settings.id },
    data: { activeTopicId: topicId },
  });
  revalidatePath("/");
  redirect(`/?topic=${topicId}`);
}

export async function toggleCoverageAction(formData: FormData) {
  const topicId = String(formData.get("topicId"));
  const key = String(formData.get("key"));
  const { COVERAGE } = await import("@/lib/coverage");
  const group = COVERAGE.find((c) => c.key === key);
  if (!group) return;

  const tasks = await prisma.studyTask.findMany({
    where: { topicId, taskType: { in: [...group.types] as TaskType[] } },
  });
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "COMPLETED");
  const next: TaskStatus = allDone ? "NOT_STARTED" : "COMPLETED";

  for (const task of tasks) {
    await prisma.studyTask.update({
      where: { id: task.id },
      data: {
        status: next,
        remainingMinutes: next === "COMPLETED" ? 0 : task.originalEstimatedMinutes,
        actualCompletionDate: next === "COMPLETED" ? new Date() : null,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/syllabus");
  revalidatePath("/progress");
}

export async function toggleSubtopicAction(formData: FormData) {
  const id = String(formData.get("subtopicId"));
  const sub = await prisma.subtopic.findUniqueOrThrow({ where: { id } });
  const next = !sub.completed;
  await prisma.subtopic.update({
    where: { id },
    data: {
      completed: next,
      lectureDone: next,
      dppDone: next,
      testDone: next,
    },
  });
  revalidatePath("/");
  revalidatePath("/syllabus");
  revalidatePath("/progress");
}
