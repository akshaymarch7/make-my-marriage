// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { SharingCard } from "./sharing-card";
const url = `https://example.test/invite/${"a".repeat(43)}`;
const fetchMock = vi.fn(); let container: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(<SharingCard guestId="guest" name="Sharma Family" maxGuests={4}/>)); }
async function click(text: string) { await act(async () => [...container.querySelectorAll("button")].find(b => b.textContent?.includes(text))!.click()); }
it("retries retrieval, copies the stable link, and never sends an invitation", async () => {
  fetchMock.mockRejectedValueOnce(new Error()).mockResolvedValueOnce(Response.json({ data: { url } })); await render(); expect(container.querySelector('[role="alert"]')).not.toBeNull(); await click("Try again");
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(); await click("Copy invitation link"); expect(copy).toHaveBeenCalledWith(url); expect(container.textContent).toContain("Invitation link copied"); expect(container.querySelector("a")!.rel).toBe("noopener noreferrer"); expect(fetchMock.mock.calls.every(call => !call[1].method)).toBe(true);
});
it("selects the URL for manual copying if clipboard access fails", async () => {
  fetchMock.mockResolvedValue(Response.json({ data: { url } })); await render(); vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error()); await click("Copy invitation link"); const input = container.querySelector("textarea")!; expect(document.activeElement).toBe(input); expect(input.selectionEnd).toBe(url.length); expect(container.textContent).toContain("copy the link above manually");
});
