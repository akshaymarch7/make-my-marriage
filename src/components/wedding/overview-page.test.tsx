// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OverviewPage } from "./overview-page";

let root: Root, container: HTMLDivElement;
const wedding: ComponentProps<typeof OverviewPage>["wedding"] = {
  id: "wedding", brideName: "Princi", groomName: "Akshay", title: "", description: "",
  weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", location: {},
  website: { slug: "our-wedding", theme: "CLASSIC", isPublished: false },
  gallery: { isEnabled: false, guestUploadsEnabled: false },
  livestream: { youtubeUrl: "", isEnabled: false },
};
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2027-02-10T20:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
});

it.each([
  [{ weddingDate: "2027-02-20" }, "9 days to go"],
  [{ timeZone: "America/Los_Angeles" }, "4 days to go"],
])("immediately updates the countdown when refreshed wedding details change: %j", async (changes, expected) => {
  await act(async () => root.render(<OverviewPage wedding={wedding}/>));
  const main = container.querySelector("main");
  expect(container.textContent).toContain("3 days to go");
  const refreshed = { ...wedding, ...changes };
  await act(async () => root.render(<OverviewPage wedding={refreshed}/>));
  expect(container.querySelector("main")).toBe(main);
  expect(container.querySelector("time")!.dateTime).toBe(refreshed.weddingDate);
  expect(container.textContent).toContain(expected);
  expect(container.textContent).not.toContain("3 days to go");
});

it("separates saved wedding members from labelled sample planning content", async () => {
  await act(async () => root.render(<OverviewPage wedding={wedding} members={[{ id: "member", name: "Actual member", role: "ADMIN" }]} role="ADMIN"/>));
  const details = container.querySelector('[aria-label="Your wedding details"]')!;
  expect(details.textContent).toContain("Actual member");
  expect(details.textContent).not.toContain("Sample");
  expect(container.textContent).toContain("The planning sections below show sample data");
  expect(container.querySelector('[aria-label="Sample planning summaries"]')?.textContent).toContain("Sample");
  expect(container.querySelector('a[href="/settings/members"]')).not.toBeNull();
  await act(async () => root.render(<OverviewPage wedding={wedding} role="MANAGER"/>));
  expect(container.querySelector('a[href="/settings/members"]')).toBeNull();
});
