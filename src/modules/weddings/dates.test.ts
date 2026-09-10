import { expect, it } from "vitest";
import { countdownLabel, daysUntilWedding, weddingDateLabel } from "./dates";
it("uses the wedding's local calendar date across midnight", () => {
  const now = new Date("2027-02-13T20:00:00Z");
  expect(daysUntilWedding("2027-02-14", "Asia/Kolkata", now)).toBe(0);
  expect(daysUntilWedding("2027-02-14", "America/Los_Angeles", now)).toBe(1);
});
it("counts calendar days across DST rather than 24-hour periods", () => {
  expect(daysUntilWedding("2027-03-15", "America/New_York", new Date("2027-03-13T17:00:00Z"))).toBe(2);
});
it("handles wedding day, past dates, and singular labels", () => {
  expect(countdownLabel(0)).toBe("Today is your wedding day");
  expect(countdownLabel(1)).toBe("1 day to go");
  expect(countdownLabel(-1)).toBe("Celebrated 1 day ago");
  expect(countdownLabel(-3)).toBe("Celebrated 3 days ago");
  expect(weddingDateLabel("2027-02-14")).toBe("14 February 2027");
});
