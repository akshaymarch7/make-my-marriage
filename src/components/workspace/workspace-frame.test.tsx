// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorkspaceFrame } from "./workspace-frame";
import { plannedFeatures } from "./navigation";
import { FeaturePreviewButton } from "./feature-preview";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("@/components/auth/auth-form", () => ({ LogoutButton: () => <button>Sign out</button> }));
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function(this: HTMLDialogElement) { this.open = true; });
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function(this: HTMLDialogElement) { this.open = false; });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render(role = "ADMIN") {
  await act(async () => root.render(<WorkspaceFrame user={{ name: "Akshay" }} role={role}><main id="wedding-content"><FeaturePreviewButton feature="expenses">Preview expenses</FeaturePreviewButton></main></WorkspaceFrame>));
}
it("keeps navigation on existing routes and restricts member management to Admins", async () => {
  await render();
  const sidebar = container.querySelector("aside")!;
  expect(sidebar.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe("/dashboard");
  expect([...sidebar.querySelectorAll("a")].map(a => a.getAttribute("href"))).toEqual(["/", "/dashboard", "/events", "/tasks", "/guests", "/wedding/edit", "/settings/members"]);
  await render("MANAGER");
  expect(sidebar.querySelector('a[href="/settings/members"]')).toBeNull();
  expect(sidebar.querySelector('a[href="/wedding/edit"]')).not.toBeNull();
});
it("opens every V1 placeholder without making a network request", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  await render();
  const buttons = [...container.querySelectorAll<HTMLButtonElement>("aside nav button")];
  expect(buttons).toHaveLength(Object.keys(plannedFeatures).length - 3);
  for (const [index, feature] of Object.entries(plannedFeatures).filter(([key]) => key !== "events" && key !== "tasks" && key !== "guests").map(([, value]) => value).entries()) {
    await act(async () => buttons[index].click());
    const panel = container.querySelector<HTMLDialogElement>('[aria-labelledby="feature-title"]')!;
    expect(panel.open).toBe(true); expect(panel.querySelector("h2")?.textContent).toBe(feature.label);
    expect(panel.textContent).toContain("nothing is created or sent");
    await act(async () => panel.querySelector<HTMLButtonElement>('button[aria-label="Close feature preview"]')!.click());
    expect(panel.open).toBe(false);
  }
  await act(async () => container.querySelector<HTMLButtonElement>("main button")!.click());
  expect(container.querySelector("#feature-title")?.textContent).toBe("Expenses");
  expect(fetch).not.toHaveBeenCalled();
});
it("closes mobile navigation before opening a feature preview", async () => {
  await render();
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Open workspace navigation"]')!.click());
  const drawer = container.querySelector<HTMLDialogElement>('dialog[aria-label="Workspace navigation"]')!;
  expect(drawer.open).toBe(true);
  await act(async () => drawer.querySelector<HTMLButtonElement>("nav button")!.click());
  expect(drawer.open).toBe(false);
  expect(container.querySelector<HTMLDialogElement>('[aria-labelledby="feature-title"]')!.open).toBe(true);
});
