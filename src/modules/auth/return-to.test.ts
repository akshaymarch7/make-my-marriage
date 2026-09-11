import { expect, it } from "vitest";
import { invitationReturnTo } from "./return-to";
it("preserves only a valid invitation return path", () => {
  const next = `/member-invitations/${"t".repeat(43)}`;
  expect(invitationReturnTo({ next })).toBe(next);
  for (const value of ["https://evil.test", "//evil.test", "/dashboard", `${next}?redirect=elsewhere`, [next]]) expect(invitationReturnTo({ next: value })).toBeUndefined();
});
