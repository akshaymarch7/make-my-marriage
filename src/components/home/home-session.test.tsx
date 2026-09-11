// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomeSession, type HomeSessionState } from "./home-session";
import { Header, PlanningButton } from "./home-interactions";

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
vi.mock("next/image", () => ({ default: () => null }));
let root: Root, container: HTMLDivElement;
let state: HomeSessionState;
let fail: boolean;
beforeEach(() => {
  state = "signed-out"; fail = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(async () => {
    if (fail) throw new Error("Offline");
    return new Response(JSON.stringify({ data: { wedding: state === "wedding" ? { id: "wedding" } : null } }), { status: state === "signed-out" ? 401 : 200 });
  }));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render(initialState: HomeSessionState) {
  state = initialState;
  await act(async () => root.render(<HomeSession initialState={initialState}><Header/><PlanningButton>Start Planning for Free</PlanningButton></HomeSession>));
}
async function openMenu() { await act(async () => container.querySelector<HTMLButtonElement>(".menu-toggle")!.click()); }
const links = (href: string) => container.querySelectorAll(`a[href="${href}"]`);

it.each(["signed-out", "onboarding", "wedding"] as const)("renders consistent desktop, mobile, and planning actions for %s", async initialState => {
  await render(initialState); await openMenu();
  if (initialState === "signed-out") {
    expect(links("/login")).toHaveLength(2); expect(links("/signup")).toHaveLength(2);
    expect(container.textContent).toContain("Start Planning for Free");
  } else {
    expect(links("/login")).toHaveLength(0); expect(links("/signup")).toHaveLength(0);
    const expected = initialState === "wedding" ? "/dashboard" : "/onboarding";
    expect(links(expected)).toHaveLength(3);
    for (const link of links(expected)) expect(link.textContent).toBe(initialState === "wedding" ? "Go to your wedding" : "Continue setup");
  }
});

it("updates on cross-tab login, wedding creation, and logout without leaving the homepage", async () => {
  await render("signed-out");
  state = "onboarding";
  await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: "mmm:session-change" })));
  expect(links("/onboarding")).toHaveLength(2);
  state = "wedding";
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(links("/dashboard")).toHaveLength(2);
  state = "signed-out";
  await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: "mmm:session-change" })));
  expect(links("/login")).toHaveLength(1); expect(links("/signup")).toHaveLength(2);
});

it("preserves known actions on network failure and removes listeners on unmount", async () => {
  await render("wedding"); fail = true;
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(links("/dashboard")).toHaveLength(2);
  await act(async () => root.unmount()); root = createRoot(container);
  vi.mocked(fetch).mockClear();
  window.dispatchEvent(new Event("focus"));
  expect(fetch).not.toHaveBeenCalled();
});
