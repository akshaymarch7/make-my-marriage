import { beforeEach, expect, it, vi } from "vitest";
import LoginPage from "./page";
import SignupPage from "../signup/page";
import { currentAccount } from "@/modules/auth/service";
vi.mock("@/modules/auth/service", () => ({ currentAccount: vi.fn() }));
vi.mock("@/components/auth/auth-page", () => ({ AuthPage: () => null }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
beforeEach(() => vi.clearAllMocks());
it.each([LoginPage, SignupPage])("redirects authenticated visitors", async page => {
  vi.mocked(currentAccount).mockResolvedValue({ user: { id: "user" } } as never);
  await expect(page()).rejects.toThrow("redirect:/onboarding");
});

it.each([LoginPage, SignupPage])("sends existing wedding members to their overview", async page => {
  vi.mocked(currentAccount).mockResolvedValue({ user: { id: "user" }, wedding: { id: "wedding" } } as never);
  await expect(page()).rejects.toThrow("redirect:/dashboard");
});
