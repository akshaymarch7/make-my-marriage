import { expect, it } from "vitest";
import { createWeddingSchema } from "./schemas";
const input = { brideName: " Princi ", groomName: " Akshay ", weddingDate: "2028-02-29", location: { formattedAddress: " Dehradun " } };
it("normalizes text, permits optional fields, and defaults the time zone", () => {
  const result = createWeddingSchema.parse(input);
  expect(result.brideName).toBe("Princi");
  expect(result.location.formattedAddress).toBe("Dehradun");
  expect(result.timeZone).toBe("Asia/Kolkata");
});
it.each(["2027-02-29", "2027-04-31", "2027-13-01", "tomorrow", "2027-02-14T00:00:00Z"])("rejects invalid date %s", weddingDate => {
  expect(createWeddingSchema.safeParse({ ...input, weddingDate }).success).toBe(false);
});
it("rejects empty location, unknown time zones, oversized names, and client-supplied ownership", () => {
  for (const extra of [{ location: { formattedAddress: " " } }, { timeZone: "Not/AZone" }, { brideName: "a".repeat(101) }, { weddingId: "other" }, { createdByUserId: "other" }, { role: "ADMIN" }, { gallery: { token: "injected" } }]) {
    expect(createWeddingSchema.safeParse({ ...input, ...extra }).success).toBe(false);
  }
});
