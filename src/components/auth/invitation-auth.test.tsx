// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";
const mocks = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
let root: Root, container: HTMLDivElement;
const returnTo = `/member-invitations/${"t".repeat(43)}`, invitedEmail = "invited@example.test";
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { hasWedding: false } }))));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it.each(["signup", "login"] as const)("prefills the invited email and returns to acceptance after %s", async mode => {
  await act(async () => root.render(<AuthForm mode={mode} returnTo={returnTo} invitedEmail={invitedEmail}/>));
  expect(container.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe(invitedEmail);
  expect(container.querySelector(`a[href="${mode === "signup" ? "/login" : "/signup"}?next=${encodeURIComponent(returnTo)}"]`)).not.toBeNull();
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).email).toBe(invitedEmail);
  expect(mocks.router.replace).toHaveBeenCalledWith(returnTo);
});
it("keeps signup guidance visible after an unsuccessful login without claiming the account exists", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: "Incorrect email or password." } }), { status: 401 }));
  await act(async () => root.render(<AuthForm mode="login" returnTo={returnTo} invitedEmail={invitedEmail}/>));
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain("Create an account to join");
  expect(container.textContent).toContain("Receiving an invitation doesn’t create an account for you.");
  expect(container.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe(invitedEmail);
  expect(mocks.router.replace).not.toHaveBeenCalled();
});
