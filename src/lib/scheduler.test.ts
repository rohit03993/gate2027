import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dayCapacity, generateSchedule } from "./scheduler";

describe("scheduler", () => {
  it("splits leftover work onto the next day", () => {
    const plan = generateSchedule({
      fromDate: "2026-09-07",
      examDate: "2026-09-09",
      weekdayHours: [0, 360, 360, 360, 360, 360, 0],
      restWeekday: null,
      minDailyMinutes: 60,
      maxDailyMinutes: 600,
      gaDripMinutes: 0,
      commitments: [],
      phases: [],
      topics: [
        { id: "t1", subjectId: "s1", expectedMarks: 10, frequency: "HIGH", inSyllabus2027: true },
      ],
      dependencies: [],
      completedTopicIds: [],
      tasks: [
        {
          id: "a",
          topicId: "t1",
          title: "Lecture 1",
          remainingMinutes: 120,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
        {
          id: "b",
          topicId: "t1",
          title: "Lecture 2",
          remainingMinutes: 180,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
        {
          id: "c",
          topicId: "t1",
          title: "Practice",
          remainingMinutes: 180,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
      ],
    });

    const monday = plan.filter((p) => p.date === "2026-09-07");
    const mondayTotal = monday.reduce((sum, p) => sum + p.plannedMinutes, 0);
    assert.equal(mondayTotal, 360);

    const leftoverTask = monday.find((p) => p.plannedMinutes < 180 && p.taskId === "c") ?? monday[monday.length - 1];
    const remainingOfThat = 180 - (monday.find((p) => p.taskId === leftoverTask.taskId)?.plannedMinutes ?? 0);
    if (remainingOfThat > 0) {
      const tuesday = plan.filter((p) => p.date === "2026-09-08" && p.taskId === leftoverTask.taskId);
      assert.ok(tuesday.length > 0, "remaining work must move to Tuesday");
      assert.equal(
        tuesday.reduce((sum, p) => sum + p.plannedMinutes, 0),
        remainingOfThat,
      );
    }
  });

  it("moves 40% leftover of a 6h Monday task onto Tuesday", () => {
    const plan = generateSchedule({
      fromDate: "2026-09-08",
      examDate: "2026-09-09",
      weekdayHours: [0, 360, 360, 360, 360, 360, 0],
      restWeekday: null,
      minDailyMinutes: 60,
      maxDailyMinutes: 600,
      gaDripMinutes: 0,
      commitments: [],
      phases: [],
      topics: [
        { id: "t1", subjectId: "s1", expectedMarks: 10, frequency: "HIGH", inSyllabus2027: true },
      ],
      dependencies: [],
      completedTopicIds: [],
      tasks: [
        {
          id: "linked-lists",
          topicId: "t1",
          title: "Linked Lists leftover",
          remainingMinutes: 144,
          status: "PARTIALLY_COMPLETED",
          isGaDrip: false,
          firstScheduledDate: "2026-09-07",
        },
        {
          id: "next",
          topicId: "t1",
          title: "Next topic",
          remainingMinutes: 300,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
      ],
    });

    const tue = plan.filter((p) => p.date === "2026-09-08");
    assert.equal(tue[0]?.taskId, "linked-lists");
    assert.equal(tue[0]?.plannedMinutes, 144);
  });

  it("reserves a GA drip even when the day is full of lectures", () => {
    const plan = generateSchedule({
      fromDate: "2026-09-07",
      examDate: "2026-09-07",
      weekdayHours: [0, 360, 360, 360, 360, 360, 0],
      restWeekday: null,
      minDailyMinutes: 60,
      maxDailyMinutes: 600,
      gaDripMinutes: 25,
      commitments: [],
      phases: [],
      topics: [
        { id: "c", subjectId: "pds", expectedMarks: 10, frequency: "HIGH", inSyllabus2027: true },
        { id: "ga", subjectId: "ga", expectedMarks: 15, frequency: "HIGH", inSyllabus2027: true, isGa: true },
      ],
      dependencies: [],
      completedTopicIds: [],
      tasks: [
        {
          id: "lecture",
          topicId: "c",
          title: "C lectures",
          remainingMinutes: 600,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
        {
          id: "ga-quant",
          topicId: "ga",
          title: "GA",
          remainingMinutes: 40,
          status: "NOT_STARTED",
          isGaDrip: true,
        },
      ],
    });

    const ga = plan.find((p) => p.taskId === "ga-quant");
    assert.ok(ga, "GA drip must be scheduled");
    assert.equal(ga?.plannedMinutes, 25);
    const lecture = plan.find((p) => p.taskId === "lecture");
    assert.equal(lecture?.plannedMinutes, 335);
  });

  it("does not fill a weekday with extra GA after the drip", () => {
    const plan = generateSchedule({
      fromDate: "2026-09-02",
      examDate: "2026-09-02",
      weekdayHours: [0, 0, 0, 420, 360, 360, 0],
      restWeekday: null,
      minDailyMinutes: 60,
      maxDailyMinutes: 600,
      gaDripMinutes: 25,
      commitments: [],
      phases: [],
      topics: [
        { id: "c", subjectId: "pds", expectedMarks: 10, frequency: "HIGH", inSyllabus2027: true },
        { id: "ga", subjectId: "ga", expectedMarks: 15, frequency: "HIGH", inSyllabus2027: true, isGa: true },
      ],
      dependencies: [],
      completedTopicIds: [],
      tasks: [
        {
          id: "c-lec",
          topicId: "c",
          title: "C lecture",
          remainingMinutes: 400,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
        {
          id: "ga-notes",
          topicId: "ga",
          title: "GA notes",
          remainingMinutes: 400,
          status: "NOT_STARTED",
          isGaDrip: false,
        },
        {
          id: "ga-drip",
          topicId: "ga",
          title: "GA drip",
          remainingMinutes: 80,
          status: "NOT_STARTED",
          isGaDrip: true,
        },
      ],
    });

    assert.equal(plan.find((p) => p.taskId === "ga-drip")?.plannedMinutes, 25);
    assert.equal(plan.find((p) => p.taskId === "ga-notes"), undefined);
    assert.equal(plan.find((p) => p.taskId === "c-lec")?.plannedMinutes, 395);
  });

  it("clamps rest days to zero capacity", () => {
    const cap = dayCapacity("2026-09-06", {
      weekdayHours: [300, 360, 360, 360, 360, 360, 480],
      restWeekday: 0,
      minDailyMinutes: 180,
      maxDailyMinutes: 600,
      commitments: [],
    });
    assert.equal(cap, 0);
  });
});
