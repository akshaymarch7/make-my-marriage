// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WeddingDraftSession } from "./draft-session";
import { UnsavedChanges } from "./unsaved-changes";
import { WeddingDetailsForm } from "./wedding-details-form";
const mocks = vi.hoisted(() => ({ router: { refresh: vi.fn(), replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
const initialValues = { brideName: "Princi", groomName: "Akshay", weddingDate: "2027-02-14", location: "Dehradun", title: "Our wedding", description: "Our family celebration", timeZone: "Asia/Kolkata" };
let root: Root, container: HTMLDivElement, userId: string | null, failure: boolean;
beforeEach(async () => {
  vi.clearAllMocks(); userId = "owner"; failure = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/auth/me"
    ? new Response(JSON.stringify(userId ? { data: { user: { id: userId }, wedding: { id: "wedding" } } } : {}), { status: userId ? 200 : 401 })
    : new Response(JSON.stringify(failure ? { error: { message: "Unavailable" } } : { data: {} }), { status: failure ? 503 : 200 })));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<WeddingDraftSession userId="owner" weddingId="wedding"><UnsavedChanges><a href="/dashboard">Back to your wedding</a><WeddingDetailsForm initialValues={initialValues}/></UnsavedChanges></WeddingDraftSession>); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const field = (name: string) => container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const button = (text: string) => [...container.querySelectorAll("button")].find(item => item.textContent === text)!;
async function fill(name: string, value: string) {
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field(name), value); field(name).dispatchEvent(new Event("input", { bubbles: true })); });
}
async function submit() { await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }
async function focus() { await act(async () => { window.dispatchEvent(new Event("focus")); }); }
it("prefills saved values and sends only changed fields including optional clearing", async () => {
  expect(field("title").value).toBe("Our wedding"); expect(button("Save changes").disabled).toBe(true);
  await fill("title", ""); expect(button("Save changes").disabled).toBe(false);
  await submit();
  const call = vi.mocked(fetch).mock.calls.find(([url]) => url === "/api/wedding")!;
  expect(call[1]?.method).toBe("PATCH"); expect(JSON.parse(call[1]!.body as string)).toEqual({ title: "" });
  expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard?updated=1");
  const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(false);
});
it("disables save again after reverting to the original value", async () => {
  await fill("title", "Different"); await fill("title", initialValues.title);
  expect(button("Save changes").disabled).toBe(true);
});
it("retains changes after save failure", async () => {
  failure = true; await fill("title", "Draft"); await submit();
  expect(field("title").value).toBe("Draft"); expect(container.textContent).toContain("We couldn’t save your changes");
  expect(mocks.router.replace).not.toHaveBeenCalled();
});
it("confirms cancellation, retains the draft on Keep editing, and discards on confirmation", async () => {
  await fill("title", "Draft");
  await act(async () => button("Cancel").click());
  expect(container.querySelector("dialog")!.open).toBe(true); expect(mocks.router.push).not.toHaveBeenCalled();
  await act(async () => button("Keep editing").click()); expect(field("title").value).toBe("Draft");
  await act(async () => button("Cancel").click()); await act(async () => button("Discard changes").click());
  expect(mocks.router.push).toHaveBeenCalledWith("/dashboard");
});
it("protects internal links and native page departure", async () => {
  await fill("title", "Draft");
  const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
  await act(async () => container.querySelector<HTMLAnchorElement>('a[href="/dashboard"]')!.click());
  expect(container.querySelector("dialog")!.open).toBe(true);
});
it("preserves edits through same-user expiry recovery and drops another user's draft", async () => {
  await fill("title", "Draft"); userId = null; await focus();
  expect(field("title").value).toBe("Draft"); expect(button("Save changes").disabled).toBe(true);
  userId = "owner"; await focus(); expect(field("title").value).toBe("Draft"); expect(button("Save changes").disabled).toBe(false);
  userId = "other"; await focus(); expect(container.querySelector("form")).toBeNull();
});
