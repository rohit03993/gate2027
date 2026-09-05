import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assignUpcomingGa,
  collectGaDone,
  gaChapters,
  gaDisplayWeek,
  nextGaChapter,
  planGaWeek,
  toggleGaChapter,
  toggleGaStep,
} from "./ga-plan";

describe("EduRev GA daily plan", () => {
  it("uses EduRev order: Quant, then Verbal / Spatial / Analytical, then PYQ tests", () => {
    const chapters = gaChapters();
    assert.equal(chapters[0]?.name, "Number System");
    assert.equal(chapters[0]?.area, "Quant");
    assert.equal(chapters.filter((row) => row.area === "Quant").length, 21);
    assert.equal(chapters.filter((row) => row.area === "Verbal").length, 11);
    assert.equal(chapters.filter((row) => row.area === "Spatial").length, 8);
    assert.equal(chapters.filter((row) => row.area === "Analytical").length, 7);
    const lastQuant = chapters.reduce((last, row, index) => (row.area === "Quant" ? index : last), -1);
    const firstVerbal = chapters.findIndex((row) => row.area === "Verbal");
    const firstSpatial = chapters.findIndex((row) => row.area === "Spatial");
    const firstPyq = chapters.findIndex((row) => row.area === "PYQ");
    assert.ok(firstVerbal > lastQuant);
    assert.ok(firstSpatial > firstVerbal);
    assert.ok(firstPyq > firstSpatial);
    assert.equal(chapters.filter((row) => row.name.startsWith("Practice test")).length, 11);
  });

  it("holds a missed chapter until it is ticked", () => {
    assert.equal(nextGaChapter(new Set())?.name, "Number System");
    const afterFirst = nextGaChapter(new Set(["ga:1:quant:number-system"]));
    assert.equal(afterFirst?.name, "Ratio & Proportion");
  });

  it("does not place GA before Monday 7 Sep", () => {
    const week = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"];
    const map = assignUpcomingGa(week, "2026-09-05", new Set());
    assert.equal(map.size, 0);
    assert.equal(gaDisplayWeek(week)[0], "2026-09-07");
    const slots = planGaWeek({
      weekDates: week,
      today: "2026-09-05",
      done: new Set(),
      logsByDate: new Map(),
    });
    assert.equal(slots[0]?.date, "2026-09-07");
    assert.equal(slots[0]?.chapter?.name, "Number System");
    assert.equal(slots[1]?.chapter?.name, "Ratio & Proportion");
  });

  it("slides the next week after a chapter is ticked", () => {
    const week = ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"];
    const slots = planGaWeek({
      weekDates: week,
      today: "2026-09-08",
      done: new Set(["ga:1:quant:number-system"]),
      logsByDate: new Map(),
      todayComplete: false,
    });
    assert.equal(slots[0]?.state, "missed");
    assert.equal(slots[1]?.chapter?.name, "Ratio & Proportion");
    assert.equal(slots[2]?.chapter?.name, "Percentages");
  });

  it("logs Lecture / DPP / Test inside the 25 min drip", () => {
    const chapter = gaChapters()[0];
    const afterLecture = toggleGaStep([], chapter, "lecture", true);
    assert.equal(afterLecture[0]?.step, "lecture");
    assert.equal(collectGaDone([afterLecture]).has(chapter.id), false);
    const done = toggleGaChapter(afterLecture, chapter);
    assert.equal(collectGaDone([done]).has(chapter.id), true);
    assert.equal(toggleGaChapter(done, chapter).length, 0);
  });
});
