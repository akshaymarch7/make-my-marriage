// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemberActions } from "./member-actions";
const mocks = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
let root: Root, node: HTMLDivElement;
const saved = vi.fn();
const member = { membershipId: "member", role: "ADMIN" as const, user: { id: "target", name: "Princi", email: "princi@example.test" } };
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: {} })))); node = document.createElement("div"); document.body.append(node); root = createRoot(node); });
afterEach(async () => { await act(async () => root.unmount()); node.remove(); vi.unstubAllGlobals(); });
async function render(self = false, lastAdmin = false) { await act(async () => root.render(<MemberActions member={member} userId={self ? "target" : "owner"} lastAdmin={lastAdmin} onSaved={saved}/>)); }
async function click(selector: string) { await act(async () => node.querySelector<HTMLButtonElement>(selector)!.click()); }
it("disables actions for the last Admin", async () => {
  await render(true, true); expect([...node.querySelectorAll<HTMLButtonElement>(":scope > div > button")].every(button => button.disabled)).toBe(true); expect(fetch).not.toHaveBeenCalled();
});
it("confirms removal before sending and reports success", async () => {
  await render(); await click(":scope > div > button:nth-child(2)"); expect(fetch).not.toHaveBeenCalled(); expect(node.querySelector("dialog")!.open).toBe(true);
  await click("dialog button:last-child"); expect(fetch).toHaveBeenCalledWith("/api/members/member", { method: "DELETE" }); expect(saved).toHaveBeenCalledWith("Princi was removed from the wedding.");
});
it("keeps a failed removal open with a retryable error", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: "Make another member an Admin first." } }), { status: 409 }));
  await render(); await click(":scope > div > button:nth-child(2)"); await click("dialog button:last-child");
  expect(node.querySelector("dialog")!.open).toBe(true); expect(node.textContent).toContain("Make another member an Admin first."); expect(saved).not.toHaveBeenCalled();
});
it("saves self-demotion and leaves the Admin page", async () => {
  await render(true); await click(":scope > div > button:first-child");
  expect(node.querySelector<HTMLButtonElement>("dialog button:last-child")!.disabled).toBe(true);
  await act(async () => { const select = node.querySelector("select")!; select.value = "MANAGER"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(node.textContent).toContain("You’ll no longer be able to manage"); await click("dialog button:last-child");
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ role: "MANAGER" }); expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard");
});
it("routes self-removal to onboarding", async () => {
  await render(true); await click(":scope > div > button:nth-child(2)"); await click("dialog button:last-child"); expect(mocks.router.replace).toHaveBeenCalledWith("/onboarding");
});
