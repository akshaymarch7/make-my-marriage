import { createHmac } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), init: vi.fn(), findOneAndUpdate: vi.fn(),
  findInvitationOwner: vi.fn(), findWedding: vi.fn(), writeRsvp: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: mocks.connect }));
vi.mock("@/config/env", () => ({ getAuthEnv: () => ({ AUTH_TOKEN_PEPPER: "test-pepper" }) }));
vi.mock("mongoose", async importOriginal => {
  const original = await importOriginal<typeof import("mongoose")>();
  return { ...original, default: { models: { AuthRateLimit: mocks } } };
});
vi.mock("./invitation-repository", () => ({ findInvitationOwner: mocks.findInvitationOwner, writeRsvp: mocks.writeRsvp }));
vi.mock("@/modules/weddings/repository", () => ({ findWedding: mocks.findWedding }));
vi.mock("@/modules/events/repository", () => ({ findInvitedEvents: vi.fn() }));
vi.mock("@/modules/memberships/service", () => ({ requireWeddingMember: vi.fn() }));
// Use the real service and limiter together; only persistence is in memory.
import { submitGuestRsvp } from "./invitation-service";

const now = 1_800_000_000_000, token = "a".repeat(43), otherToken = "b".repeat(43);
const input = { status: "ATTENDING", attendingCount: 1 };
const owner = { id: "111111111111111111111111", weddingId: "222222222222222222222222", name: "Family", maxGuests: 4, invitedEventIds: [], rsvpStatus: "PENDING", attendingCount: null, updatedAt: null, version: 0 };
const counts = new Map<string, number>();
const globalKey = createHmac("sha256", "test-pepper").update(`global:guest-rsvp:${Math.floor(now / 60000)}`).digest("hex");
beforeEach(() => {
  vi.resetAllMocks(); counts.clear(); vi.spyOn(Date, "now").mockReturnValue(now);
  mocks.findOneAndUpdate.mockImplementation(async ({ _id }: { _id: string }) => {
    const count = (counts.get(_id) ?? 0) + 1; counts.set(_id, count); return { count };
  });
  mocks.findInvitationOwner.mockImplementation(async (value: string) => value === token ? owner : value === otherToken ? { ...owner, id: "333333333333333333333333", weddingId: "444444444444444444444444" } : null);
  mocks.findWedding.mockResolvedValue({});
  mocks.writeRsvp.mockResolvedValue({ ...input, updatedAt: null });
});
afterEach(() => vi.restoreAllMocks());

it("300 attempts on one invitation spend only 20 shared slots and leave another wedding able to RSVP", async () => {
  for (let index = 0; index < 300; index++) {
    if (index < 20) await expect(submitGuestRsvp(token, input)).resolves.toMatchObject(input);
    else await expect(submitGuestRsvp(token, input)).rejects.toMatchObject({ category: "RATE_LIMITED" });
  }
  expect(counts.get(globalKey)).toBe(20);
  expect(mocks.writeRsvp).toHaveBeenCalledTimes(20);
  await expect(submitGuestRsvp(otherToken, input)).resolves.toMatchObject(input);
  expect(counts.get(globalKey)).toBe(21);
  expect(mocks.writeRsvp).toHaveBeenLastCalledWith(expect.objectContaining({ weddingId: "444444444444444444444444" }), otherToken, input);
});

it("distinct nonexistent tokens cannot spend shared capacity", async () => {
  for (let index = 0; index < 300; index++) {
    const invalidToken = String(index).padStart(43, "0");
    await expect(submitGuestRsvp(invalidToken, input)).rejects.toMatchObject({ category: "NOT_FOUND" });
  }
  expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  expect(mocks.writeRsvp).not.toHaveBeenCalled();
  await expect(submitGuestRsvp(otherToken, input)).resolves.toMatchObject(input);
  expect(counts.get(globalKey)).toBe(1);
});

it("rejects deleted weddings, malformed tokens and excessive headcounts before spending capacity", async () => {
  await expect(submitGuestRsvp("invalid", input)).rejects.toMatchObject({ category: "NOT_FOUND" });
  expect(mocks.findInvitationOwner).not.toHaveBeenCalled();
  mocks.findWedding.mockResolvedValueOnce(null);
  await expect(submitGuestRsvp(token, input)).rejects.toMatchObject({ category: "NOT_FOUND" });
  await expect(submitGuestRsvp(token, { ...input, attendingCount: 5 })).rejects.toMatchObject({ code: "PARTY_SIZE_CHANGED" });
  expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  expect(mocks.writeRsvp).not.toHaveBeenCalled();
});

it("still rate limits idempotent responses without rewriting the RSVP", async () => {
  mocks.findInvitationOwner.mockResolvedValue({ ...owner, rsvpStatus: "ATTENDING", attendingCount: 1 });
  for (let index = 0; index < 20; index++) await submitGuestRsvp(token, input);
  await expect(submitGuestRsvp(token, input)).rejects.toMatchObject({ category: "RATE_LIMITED" });
  expect(counts.get(globalKey)).toBe(20);
  expect(mocks.writeRsvp).not.toHaveBeenCalled();
});
