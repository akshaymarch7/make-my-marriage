import { beforeEach, expect, it, vi } from "vitest";
import { invitedEmailForAuth } from "./invitation-context";
import { getPublicInvitation } from "@/modules/memberships/service";
import { AppError } from "@/server/http/app-error";
vi.mock("@/modules/memberships/service", () => ({ getPublicInvitation: vi.fn() }));
const token = "t".repeat(43), path = `/member-invitations/${token}`;
beforeEach(() => vi.resetAllMocks());
it("loads the invited email from the validated invitation, not a query email", async () => {
  vi.mocked(getPublicInvitation).mockResolvedValue({ email: "invited@example.test" } as never);
  expect(await invitedEmailForAuth(path)).toBe("invited@example.test");
  expect(getPublicInvitation).toHaveBeenCalledWith(token);
});
it("does not look up arbitrary return destinations", async () => {
  expect(await invitedEmailForAuth("https://elsewhere.test")).toBeUndefined();
  expect(await invitedEmailForAuth()).toBeUndefined(); expect(getPublicInvitation).not.toHaveBeenCalled();
});
it("allows account access for expired invitations without prefilling stale details", async () => {
  vi.mocked(getPublicInvitation).mockRejectedValue(new AppError({ category: "TOKEN_EXPIRED", message: "Expired" }));
  expect(await invitedEmailForAuth(path)).toBeUndefined();
});
