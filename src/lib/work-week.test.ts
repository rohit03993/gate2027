import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOURS_BY_DOW, paceDays, sumHours, weekCarry, weekMonday, workWeekPace } from "./work-week";

describe("work week capacity", () => {
  it("counts 4h weekdays and 8h weekends", () => {
    const hours = [...DEFAULT_HOURS_BY_DOW];
    assert.equal(sumHours("2026-09-07", "2026-09-11", hours), 20);
    assert.equal(sumHours("2026-09-12", "2026-09-13", hours), 16);
    assert.equal(sumHours("2026-09-07", "2026-09-13", hours), 36);
  });

  it("does not count delay before Monday 7 Sep", () => {
    const pace = workWeekPace({
      today: "2026-09-05",
      remainingHours: 842,
      totalHours: 842,
      loggedHours: 0,
      coreRemaining: 842,
      coreTotal: 842,
    });
    assert.equal(pace.started, false);
    assert.equal(pace.expectedDone, 0);
    assert.equal(pace.delayDays, 0);
    assert.equal(pace.aheadDays, 0);
    assert.equal(pace.startDate, "2026-09-07");
  });

  it("counts a missed Monday as one day late", () => {
    const { delayDays, aheadDays } = paceDays({
      today: "2026-09-08",
      startDate: "2026-09-07",
      actualDone: 0,
      hoursByDow: [...DEFAULT_HOURS_BY_DOW],
    });
    assert.equal(delayDays, 1);
    assert.equal(aheadDays, 0);
  });

  it("counts leftover after today as one day ahead", () => {
    const { delayDays, aheadDays } = paceDays({
      today: "2026-09-07",
      startDate: "2026-09-07",
      actualDone: 8,
      hoursByDow: [...DEFAULT_HOURS_BY_DOW],
    });
    assert.equal(delayDays, 0);
    assert.equal(aheadDays, 1);
  });

  it("slips the estimated finish when remaining is laid from a later day", () => {
    const onTime = workWeekPace({
      today: "2026-09-07",
      remainingHours: 40,
      totalHours: 40,
      loggedHours: 0,
      coreRemaining: 40,
      coreTotal: 40,
    });
    const skipped = workWeekPace({
      today: "2026-09-08",
      remainingHours: 40,
      totalHours: 40,
      loggedHours: 0,
      coreRemaining: 40,
      coreTotal: 40,
    });
    assert.equal(onTime.delayDays, 0);
    assert.equal(skipped.delayDays, 1);
    assert.ok(skipped.projectedFinish && onTime.projectedFinish);
    assert.ok(skipped.projectedFinish > onTime.projectedFinish);
  });

  it("finds Monday of the current week", () => {
    assert.equal(weekMonday("2026-09-05"), "2026-08-31");
    assert.equal(weekMonday("2026-09-07"), "2026-09-07");
  });

  it("does not carry missed hours before the clock starts", () => {
    const rows = weekCarry(
      [
        { date: "2026-09-05", target: 8, actual: 0 },
        { date: "2026-09-06", target: 8, actual: 0 },
        { date: "2026-09-07", target: 4, actual: 0 },
      ],
      "2026-09-07",
    );
    assert.equal(rows[0].carryOut, 0);
    assert.equal(rows[1].carryOut, 0);
    assert.equal(rows[2].carryIn, 0);
    assert.equal(rows[2].carryOut, 4);
  });

  it("stacks a missed day onto the next target", () => {
    const rows = weekCarry(
      [
        { date: "2026-09-07", target: 4, actual: 0 },
        { date: "2026-09-08", target: 4, actual: 8 },
        { date: "2026-09-09", target: 4, actual: 0 },
      ],
      "2026-09-07",
    );
    assert.equal(rows[0].carryOut, 4);
    assert.equal(rows[1].carryIn, 4);
    assert.equal(rows[1].carryOut, 0);
    assert.equal(rows[2].carryIn, 0);
    assert.equal(rows[2].carryOut, 4);
  });
});
