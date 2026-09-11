import { expect, it, vi } from "vitest";
import Home from "./page";
import { currentAccount } from "@/modules/auth/service";
vi.mock("@/modules/auth/service", () => ({ currentAccount: vi.fn() }));

it.each([
  [null, "signed-out"],
  [{ user: { id: "user" }, wedding: null }, "onboarding"],
  [{ user: { id: "user" }, wedding: { id: "wedding" } }, "wedding"],
])("provides the current account state on the initial server render", async (account, expected) => {
  vi.mocked(currentAccount).mockResolvedValue(account as never);
  const page = await Home();
  expect(page.props.initialState).toBe(expected);
});
