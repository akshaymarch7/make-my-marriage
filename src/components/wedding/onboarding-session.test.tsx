// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OnboardingSession } from "./onboarding-session";
import { OnboardingForm } from "./onboarding-form";

const mocks = vi.hoisted(() => ({ router: { refresh: vi.fn(), replace: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
let root: Root;
let container: HTMLDivElement;
let identity: "owner" | "other" | null;
let rejectCreation: boolean;
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  identity = "owner"; rejectCreation = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/auth/me") return identity
      ? response({ data: { user: { id: identity }, wedding: null } })
      : response({ error: { code: "UNAUTHENTICATED" } }, 401);
    if (url === "/api/wedding") return rejectCreation
      ? response({ error: { code: "UNAUTHENTICATED" } }, 401)
      : response({ data: { id: "wedding" } }, 201);
    throw new Error(`Unexpected URL: ${url}`);
  }));
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<OnboardingSession userId="owner"><OnboardingForm/></OnboardingSession>); });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); vi.unstubAllGlobals();
});

function input(name: string) { return container.querySelector<HTMLInputElement>(`[name="${name}"]`)!; }
async function fill(name: string, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(name), value);
    input(name).dispatchEvent(new Event("input", { bubbles: true }));
    input(name).dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function draft() {
  await fill("brideName", "Princi"); await fill("groomName", "Akshay");
  await fill("weddingDate", "2027-02-14"); await fill("location", "Dehradun");
  await fill("title", "Our wedding draft");
}
async function focus() { await act(async () => { window.dispatchEvent(new Event("focus")); }); }
async function submit() { await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }
function weddingRequests() { return vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/wedding"); }

it("preserves the mounted draft on focus expiry and resumes for the same user", async () => {
  await draft();
  const originalForm = container.querySelector("form");
  identity = null; await focus();
  expect(container.querySelector("form")).toBe(originalForm);
  expect(input("title").value).toBe("Our wedding draft");
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  expect(container.textContent).toContain("Your session expired");
  expect(container.querySelector('a[href="/login"]')?.getAttribute("target")).toBe("_blank");
  expect(mocks.router.replace).not.toHaveBeenCalled();
  await submit(); expect(weddingRequests()).toHaveLength(0);
  identity = "owner"; await focus();
  expect(container.querySelector("form")).toBe(originalForm);
  expect(input("title").value).toBe("Our wedding draft");
  expect(container.querySelector("fieldset")!.disabled).toBe(false);
  await submit();
  expect(weddingRequests()).toHaveLength(1);
  expect(JSON.parse(weddingRequests()[0][1]!.body as string)).toMatchObject({ brideName: "Princi", title: "Our wedding draft" });
});

it("unmounts the old user's draft on different-user reauthentication", async () => {
  await draft(); identity = null; await focus();
  identity = "other"; await focus();
  expect(container.querySelector("form")).toBeNull();
  expect(container.textContent).not.toContain("Our wedding draft");
  expect(mocks.router.refresh).toHaveBeenCalled();
  expect(weddingRequests()).toHaveLength(0);
  await act(async () => { root.render(<OnboardingSession key="other" userId="other"><OnboardingForm/></OnboardingSession>); });
  expect(input("title").value).toBe("");
  expect(input("brideName").value).toBe("");
});

it("keeps the draft when expiry happens during creation", async () => {
  await draft(); rejectCreation = true;
  await submit();
  expect(weddingRequests()).toHaveLength(1);
  expect(input("title").value).toBe("Our wedding draft");
  expect(container.textContent).toContain("Your session expired");
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  rejectCreation = false; await focus(); await submit();
  expect(weddingRequests()).toHaveLength(2);
});

it("checks identity before submitting a draft even without a focus event", async () => {
  await draft(); identity = "other";
  await submit();
  expect(weddingRequests()).toHaveLength(0);
  expect(container.querySelector("form")).toBeNull();
});

it("retains the draft on a failed session check and allows retry", async () => {
  await draft();
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Offline"));
  await focus();
  expect(input("title").value).toBe("Our wedding draft");
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  await focus();
  expect(container.querySelector("fieldset")!.disabled).toBe(false);
});
