// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MembersPage } from "./members-page";
import { AcceptInvitation } from "./accept-invitation";
const mocks = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
const token = "t".repeat(43), email = "family@example.test";
const invitation = { email, role: "MANAGER", wedding: { brideName: "Princi", groomName: "Akshay", weddingDate: "2027-02-14" } };
let root: Root, container: HTMLDivElement;
let account: { user: { id: string; email: string }; wedding: { id: string } | null } | null;
let errorCode: string | null, mutationFailure: boolean;
beforeEach(() => {
  vi.clearAllMocks(); account = null; errorCode = null; mutationFailure = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST" || options?.method === "DELETE") return new Response(JSON.stringify(mutationFailure ? { error: { code: "EXTERNAL_SERVICE_ERROR", message: "Please try again." } } : { data: {} }), { status: mutationFailure ? 503 : 200 });
    if (url === "/api/auth/me") return new Response(JSON.stringify({ data: account }), { status: account ? 200 : 401 });
    if (url.startsWith("/api/public/")) return new Response(JSON.stringify(errorCode ? { error: { code: errorCode, message: "Invitation unavailable." } } : { data: invitation }), { status: errorCode ? 400 : 200 });
    if (url === "/api/members") return new Response(JSON.stringify({ data: [{ membershipId: "member", user: { id: "owner", name: "Akshay", email: "owner@example.test" }, role: "ADMIN", joinedAt: "2026-09-01" }] }));
    return new Response(JSON.stringify({ data: [{ id: "invitation", email, role: "MANAGER", expiresAt: "2027-02-01T00:00:00Z" }] }));
  }));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const button = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent?.trim() === text)!;
async function render(child: ReactNode) { await act(async () => root.render(child)); }
async function click(text: string) { await act(async () => button(text).click()); }
async function focus() { await act(async () => window.dispatchEvent(new Event("focus"))); }
async function fillEmail(value: string) {
  const field = container.querySelector<HTMLInputElement>("#invite-email")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, value); field.dispatchEvent(new Event("input", { bubbles: true })); });
}
it("preserves the invitation destination through sign-in and account creation", async () => {
  await render(<AcceptInvitation token={token}/>);
  const firstAuthLink = container.querySelector('a[href^="/signup"], a[href^="/login"]')!;
  expect(firstAuthLink.textContent).toBe("Create an account to join");
  expect(container.textContent).toContain("Already have an account?");
  expect(container.querySelector('a[href^="/login"]')!.getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/member-invitations/${token}`)}`);
  expect(container.querySelector('a[href^="/signup"]')).not.toBeNull(); expect(container.textContent).toContain(email);
});
it("rechecks account state on focus and accepts only from the matching account", async () => {
  await render(<AcceptInvitation token={token}/>);
  account = { user: { id: "recipient", email }, wedding: null }; await focus();
  await click("Accept invitation");
  expect(container.textContent).toContain("Invitation accepted");
  expect(container.querySelector('a[href="/dashboard"]')).not.toBeNull();
  expect(vi.mocked(fetch).mock.calls.some(([url, options]) => url === `/api/member-invitations/${token}/accept` && options?.method === "POST")).toBe(true);
});
it("offers account switching for a mismatched email and retains the return path", async () => {
  account = { user: { id: "other", email: "wrong@example.test" }, wedding: null };
  await render(<AcceptInvitation token={token}/>); expect(button("Accept invitation")).toBeUndefined();
  await click("Sign in with the invited email");
  expect(mocks.router.replace).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(`/member-invitations/${token}`)}`);
});
it("blocks acceptance when the matching account already has a wedding", async () => {
  account = { user: { id: "recipient", email }, wedding: { id: "wedding" } };
  await render(<AcceptInvitation token={token}/>);
  expect(container.textContent).toContain("already belongs to a wedding"); expect(button("Accept invitation")).toBeUndefined();
});
it.each(["TOKEN_EXPIRED", "INVALID_TOKEN", "INVITATION_ALREADY_ACCEPTED"])("handles %s links without offering acceptance", async code => {
  errorCode = code; await render(<AcceptInvitation token={token}/>);
  expect(container.textContent).toContain("Invitation unavailable."); expect(button("Accept invitation")).toBeUndefined();
});
it("retains form values on invitation failure and sends a normalized email on retry", async () => {
  await render(<MembersPage userId="owner"/>); await click("＋ Invite member"); await fillEmail(" Family@Example.test ");
  mutationFailure = true;
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(container.querySelector<HTMLDialogElement>('dialog[aria-labelledby="invite-title"]')!.open).toBe(true);
  expect(container.querySelector<HTMLInputElement>("#invite-email")!.value).toContain("Family@Example.test");
  expect(container.textContent).toContain("Please try again."); mutationFailure = false;
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain(`Invitation email sent to ${email}`);
  const call = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST")!;
  expect(JSON.parse(call[1]!.body as string)).toEqual({ email, role: "MANAGER" });
});
it("requires confirmation before revoking an invitation", async () => {
  await render(<MembersPage userId="owner"/>);
  await act(async () => [...container.querySelectorAll("button")].find(item => item.textContent?.includes(`for ${email}`))!.click());
  expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  await click("Keep invitation");
  await act(async () => [...container.querySelectorAll("button")].find(item => item.textContent?.includes(`for ${email}`))!.click());
  await click("Revoke invitation"); expect(container.textContent).toContain(`Invitation to ${email} revoked.`);
});
