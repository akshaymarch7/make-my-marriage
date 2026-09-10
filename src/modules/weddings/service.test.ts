import { beforeEach, expect, it, vi } from "vitest";
import { createWedding, getWeddingContext } from "./service";
import * as weddings from "./repository";
import * as members from "@/modules/memberships/repository";

const state = vi.hoisted(() => ({ transaction: vi.fn(), session: {} }));
vi.mock("./repository", () => ({ initializeWeddings: vi.fn(), insertWedding: vi.fn(), findWedding: vi.fn() }));
vi.mock("@/modules/memberships/repository", () => ({ findMembership: vi.fn(), initializeMemberships: vi.fn(), createAdminMembership: vi.fn() }));
const userId = "123456789012345678901234";
const weddingId = "223456789012345678901234";
const input = { brideName: "Princi", groomName: "Akshay", weddingDate: "2027-02-14", location: { city: "Dehradun" } };
beforeEach(() => {
  vi.resetAllMocks();
  state.transaction.mockImplementation(async callback => callback(state.session));
  vi.mocked(weddings.initializeWeddings).mockResolvedValue({ transaction: state.transaction } as never);
  vi.mocked(members.findMembership).mockResolvedValue(null);
  vi.mocked(weddings.insertWedding).mockResolvedValue({ id: weddingId, brideName: "Princi", groomName: "Akshay", weddingDate: input.weddingDate, website: { slug: "princi-akshay-14022027" } });
});
it("creates the wedding and Admin membership inside the same transaction", async () => {
  const result = await createWedding(userId, input);
  expect(result.id).toBe(weddingId);
  expect(members.createAdminMembership).toHaveBeenCalledWith(userId, weddingId, state.session);
  expect(weddings.insertWedding).toHaveBeenCalledWith(expect.any(Object), userId, "princi-akshay-14022027", expect.stringMatching(/^[\w-]{43}$/), state.session);
});
it("refuses users with an existing membership before inserting a wedding", async () => {
  vi.mocked(members.findMembership).mockResolvedValue({ weddingId, role: "ADMIN" });
  await expect(createWedding(userId, input)).rejects.toMatchObject({ code: "ALREADY_HAS_WEDDING" });
  expect(weddings.insertWedding).not.toHaveBeenCalled();
});
it("propagates membership failure out of the transaction so MongoDB rolls it back", async () => {
  vi.mocked(members.createAdminMembership).mockRejectedValue(new Error("Membership insert failed"));
  await expect(createWedding(userId, input)).rejects.toThrow("Membership insert failed");
  expect(state.transaction).toHaveBeenCalledOnce();
});
it("retries a slug collision with a stable numeric suffix", async () => {
  vi.mocked(weddings.insertWedding).mockRejectedValueOnce({ code: 11000, keyPattern: { "website.slug": 1 } });
  await createWedding(userId, input);
  expect(vi.mocked(weddings.insertWedding).mock.calls[1][2]).toBe("princi-akshay-14022027-2");
});
it("maps concurrent membership conflicts without retrying creation", async () => {
  vi.mocked(members.createAdminMembership).mockRejectedValue({ code: 11000, keyPattern: { userId: 1 } });
  vi.mocked(members.findMembership).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ weddingId, role: "ADMIN" });
  await expect(createWedding(userId, input)).rejects.toMatchObject({ code: "ALREADY_HAS_WEDDING" });
});
it("derives the wedding lookup exclusively from membership", async () => {
  vi.mocked(members.findMembership).mockResolvedValue({ weddingId, role: "MANAGER" });
  vi.mocked(weddings.findWedding).mockResolvedValue({ id: weddingId } as never);
  expect(await getWeddingContext(userId)).toMatchObject({ membership: { role: "MANAGER" }, wedding: { id: weddingId } });
  expect(weddings.findWedding).toHaveBeenCalledWith(weddingId);
});
it("returns NOT_FOUND for a missing or deleted wedding", async () => {
  vi.mocked(members.findMembership).mockResolvedValue({ weddingId, role: "ADMIN" });
  vi.mocked(weddings.findWedding).mockResolvedValue(null);
  await expect(getWeddingContext(userId)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
