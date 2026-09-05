import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOURS_BY_DOW, sumHours, weekMonday, workWeekPace } from "./work-week";

describe("work week capacity", () => {
  it("counts 4h weekdays and 8h weekends", () => {
    const hours = [...DEFAULT_HOURS_BY_DOW];
    assert.equal(sumHours("2026-09-07", "2026-09-11", hours), 20);
    assert.equal(sumHours("2026-09-12", "2026-09-13", hours), 16);
    assert.equal(sumHours("2026-09-07", "2026-09-13", hours), 36);
  });

  it("treats a Saturday as an 8h day and delay vs hours put in, not 11h/day", () => {
    const pace = workWeekPace({
      today: "2026-09-05",
      remainingHours: 1300,
      totalHours: 1330,
      loggedHours: 0,
      coreRemaining: 800,
      coreTotal: 842,
      startDate: "2026-09-02",
      deadline: "2026-12-31",
    });
    assert.equal(pace.todayTarget, 8);
    assert.equal(pace.expectedDone, 12);
    assert.equal(pace.delayHours, 0);
    assert.equal(pace.aheadHours, 18);
    assert.ok(pace.weeklyHours === 36);
  });

  it("finds Monday of the current week", () => {
    assert.equal(weekMonday("2026-09-05"), "2026-08-31");
    assert.equal(weekMonday("2026-09-07"), "2026-09-07");
  });
});
