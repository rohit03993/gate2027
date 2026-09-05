import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_HOURS_BY_DOW } from "./work-week";
import { formatWindow, scheduleTopicWindows, windowForHours } from "./windows";
import { splitStepHours } from "./study-load";

describe("calendar windows", () => {
  it("fits 10h on a Saturday start as Sat + Sunday leftover", () => {
    const win = windowForHours("2026-09-05", 10, [...DEFAULT_HOURS_BY_DOW]);
    assert.equal(win.start, "2026-09-05");
    assert.equal(win.end, "2026-09-06");
  });

  it("fits a 4h topic on a single Monday", () => {
    const win = windowForHours("2026-09-07", 4, [...DEFAULT_HOURS_BY_DOW]);
    assert.equal(win.start, "2026-09-07");
    assert.equal(win.end, "2026-09-07");
  });

  it("places later subjects on the calendar after core", () => {
    const { byCode, core, tree } = scheduleTopicWindows({
      today: "2026-09-05",
      topics: [
        { code: "PDS-C", remainingHours: 8 },
        { code: "PDS-REC", remainingHours: 8 },
        { code: "DL-BOOL", remainingHours: 20 },
      ],
    });
    assert.equal(byCode.get("PDS-C")?.start, "2026-09-07");
    assert.equal(byCode.get("PDS-C")?.end, "2026-09-08");
    assert.equal(byCode.get("PDS-REC")?.start, "2026-09-09");
    assert.equal(byCode.get("PDS-REC")?.end, "2026-09-10");
    assert.equal(byCode.get("DL-BOOL")?.later, true);
    assert.equal(byCode.get("DL-BOOL")?.start, "2026-09-11");
    assert.equal(byCode.get("DL-BOOL")?.end, "2026-09-13");
    assert.equal(core.start, "2026-09-07");
    assert.equal(core.end, "2026-09-10");
    assert.equal(tree.end, "2026-09-13");
    assert.equal(formatWindow("2026-09-11", "2026-09-13", true), "11–13 Sep");
    assert.equal(formatWindow(null, null), "done");
  });

  it("splits chunk hours so lecture + DPP + test add up", () => {
    const split = splitStepHours(10);
    assert.equal(split.lecture, 5.5);
    assert.equal(split.dpp, 2.5);
    assert.equal(split.test, 2);
    assert.equal(Math.round((split.lecture + split.dpp + split.test) * 10) / 10, 10);
  });
});
