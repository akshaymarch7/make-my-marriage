import { beforeEach, expect, it, vi } from "vitest";
import { updateWeddingSchema } from "./schemas";
import { updateWedding } from "./service";
import { findMembership } from "@/modules/memberships/repository";
import { findWedding, patchWedding } from "./repository";
vi.mock("./repository", () => ({ findWedding: vi.fn(), patchWedding: vi.fn() }));
vi.mock("@/modules/memberships/repository", () => ({ findMembership: vi.fn() }));
const userId = "123456789012345678901234";
const weddingId = "223456789012345678901234";
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "ADMIN" });
  vi.mocked(findWedding).mockResolvedValue({ id: weddingId, location: { city: "Dehradun" } } as never);
  vi.mocked(patchWedding).mockResolvedValue(true);
});
it("does not add defaults or overwrite absent fields", () => {
  expect(updateWeddingSchema.parse({ title: " Updated " })).toEqual({ title: "Updated" });
  expect(updateWeddingSchema.parse({ description: "" })).toEqual({ description: "" });
});
it.each([{}, { weddingId }, { website: { slug: "changed" } }, { gallery: { token: "changed" } }, { role: "ADMIN" }, { weddingDate: "2027-02-29" }, { timeZone: "bad/zone" }, { location: {} }])("rejects invalid or protected updates %j", changes => {
  expect(updateWeddingSchema.safeParse(changes).success).toBe(false);
});
it.each(["ADMIN", "MANAGER"] as const)("allows %s and scopes writes to its membership", async role => {
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role });
  await updateWedding(userId, { title: "", weddingDate: "2027-03-01" });
  expect(patchWedding).toHaveBeenCalledWith(weddingId, { title: "", weddingDate: "2027-03-01" });
});
it("does not write when membership is missing", async () => {
  vi.mocked(findMembership).mockResolvedValue(null);
  await expect(updateWedding(userId, { title: "New" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(patchWedding).not.toHaveBeenCalled();
});
it("rejects unauthorized roles", async () => {
  vi.mocked(findMembership).mockResolvedValue({ weddingId, role: "VIEWER" } as never);
  await expect(updateWedding(userId, { title: "New" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(patchWedding).not.toHaveBeenCalled();
});
it("validates location against retained fields", async () => {
  await updateWedding(userId, { location: { state: "Uttarakhand" } });
  expect(patchWedding).toHaveBeenCalledWith(weddingId, { location: { state: "Uttarakhand" } });
  await expect(updateWedding(userId, { location: { city: "", formattedAddress: "" } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
});
it("returns NOT_FOUND if the wedding disappears before the update", async () => {
  vi.mocked(patchWedding).mockResolvedValue(false);
  await expect(updateWedding(userId, { title: "New" })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
