// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { PublicInvitationPage } from "./public-invitation";
import type { PublicInvitation } from "@/modules/guests/invitation-schemas";
const events = vi.hoisted(() => ({ refresh: () => {}, notify: vi.fn() }));
vi.mock("@/components/auth/session-events", () => ({ notifySessionChange: events.notify, watchSessionChanges: (fn: () => void) => { events.refresh = fn; return () => {}; } }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
const initial: PublicInvitation = { guest: { name: "Sharma Family", maxGuests: 4, rsvpStatus: "PENDING", attendingCount: null }, wedding: { brideName: "Simran", groomName: "Raj", weddingDate: "2026-12-12", timeZone: "Asia/Kolkata", title: "A royal celebration", location: "Jaipur" }, events: [] };
const fetchMock = vi.fn(); let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", fetchMock); vi.stubGlobal("requestAnimationFrame", () => 0); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render(value = initial) { await act(async () => root.render(<PublicInvitationPage initial={value} token={"a".repeat(43)}/>)); }
async function choose(value: string) { await act(async () => container.querySelector<HTMLInputElement>(`input[value="${value}"]`)!.click()); }
async function submit() { await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }
async function button(text: string) { await act(async () => [...container.querySelectorAll("button")].find(b => b.textContent?.startsWith(text))!.click()); }
it("validates a choice, saves a group count, and supports declining after attendance", async () => {
  await render(); await submit(); expect(fetchMock).not.toHaveBeenCalled(); expect(container.textContent).toContain("Please let us know");
  await choose("ATTENDING"); await act(async () => { const select = container.querySelector("select")!; select.value = "3"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  fetchMock.mockResolvedValueOnce(Response.json({ data: { status: "ATTENDING", attendingCount: 3, updatedAt: null } })); await submit();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ status: "ATTENDING", attendingCount: 3 }); expect(container.textContent).toContain("Attending: 3 people"); expect(container.querySelector("form")).toBeNull();
  await button("Update response"); await choose("NOT_ATTENDING"); fetchMock.mockResolvedValueOnce(Response.json({ data: { status: "NOT_ATTENDING", attendingCount: 0, updatedAt: null } })); await submit();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).attendingCount).toBe(0); expect(container.textContent).toContain("You will be missed warmly"); expect(events.notify).toHaveBeenCalledTimes(2);
});
it("retains selection on network failure and hides private details if the link is removed", async () => {
  await render(); await choose("ATTENDING"); fetchMock.mockRejectedValueOnce(new Error("offline")); await submit();
  expect(container.querySelector<HTMLInputElement>('input[value="ATTENDING"]')!.checked).toBe(true); expect(container.textContent).toContain("Your selection is still here");
  fetchMock.mockResolvedValueOnce(Response.json({ error: {} }, { status: 404 })); await submit(); expect(container.textContent).toContain("This invitation is unavailable"); expect(container.textContent).not.toContain("Sharma");
});
it("refreshes a changed capacity after conflict while retaining the draft", async () => {
  await render(); await choose("ATTENDING"); fetchMock.mockResolvedValueOnce(Response.json({ error: { message: "Review latest details" } }, { status: 409 })).mockResolvedValueOnce(Response.json({ data: { ...initial, guest: { ...initial.guest, maxGuests: 1 } } })); await submit();
  expect(container.querySelector<HTMLInputElement>("#attending-count")!.value).toBe("1"); expect(container.textContent).toContain("Review latest details");
  fetchMock.mockResolvedValueOnce(Response.json({ data: { status: "ATTENDING", attendingCount: 1, updatedAt: null } })); await submit(); expect(JSON.parse(fetchMock.mock.calls[2][1].body).attendingCount).toBe(1);
});
it("does not let a stale focus refresh overwrite a newer saved RSVP", async () => {
  let resolve!: (value: Response) => void; fetchMock.mockImplementationOnce(() => new Promise(r => { resolve = r; })); await render(); await act(async () => events.refresh()); await choose("ATTENDING"); fetchMock.mockResolvedValueOnce(Response.json({ data: { status: "ATTENDING", attendingCount: 1, updatedAt: null } })); await submit(); await act(async () => resolve(Response.json({ data: initial }))); expect(container.textContent).toContain("Confirmed attending");
});
it("canceling an edit keeps the saved response", async () => {
  await render({ ...initial, guest: { ...initial.guest, rsvpStatus: "ATTENDING", attendingCount: 2 } }); await button("Update response"); await choose("NOT_ATTENDING"); await button("Cancel"); expect(container.textContent).toContain("Attending: 2 people"); expect(fetchMock).not.toHaveBeenCalled();
});
