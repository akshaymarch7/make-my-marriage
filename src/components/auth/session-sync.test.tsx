import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessionSync } from "./session-sync";
import { notifySessionChange } from "./session-events";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), setHidden: vi.fn(), effects: [] as (() => (() => void))[] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("react", () => ({ useState: () => [false, mocks.setHidden], useEffect: (effect: () => (() => void)) => mocks.effects.push(effect) }));
let cleanup: (() => void) | undefined;
beforeEach(() => {
  vi.clearAllMocks(); mocks.effects.length = 0;
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
  vi.stubGlobal("localStorage", { setItem: vi.fn() });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ data: { user: { id: "user" } } }) }));
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); });
async function mount() {
  SessionSync({ userId: "user", children: "welcome" });
  cleanup = mocks.effects[0]();
  await vi.waitFor(() => expect(mocks.setHidden).toHaveBeenCalledWith(false));
}
it("hides stale content and navigates away when another tab logs out", async () => {
  await mount();
  vi.mocked(fetch).mockResolvedValue({ status: 401 } as Response);
  window.dispatchEvent(Object.assign(new Event("storage"), { key: "mmm:session-change" }));
  await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  expect(mocks.setHidden).toHaveBeenCalledWith(true);
  expect(mocks.refresh).toHaveBeenCalled();
});
it("revalidates on focus and ignores unrelated storage changes", async () => {
  await mount();
  const initial = vi.mocked(fetch).mock.calls.length;
  window.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated" }));
  expect(fetch).toHaveBeenCalledTimes(initial);
  window.dispatchEvent(new Event("focus"));
  expect(fetch).toHaveBeenCalledTimes(initial + 1);
  cleanup?.(); cleanup = undefined;
  window.dispatchEvent(new Event("focus"));
  expect(fetch).toHaveBeenCalledTimes(initial + 1);
});
it("does not sign out on network failure", async () => {
  await mount();
  vi.mocked(fetch).mockRejectedValue(new TypeError("Offline"));
  window.dispatchEvent(new Event("focus"));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mocks.replace).not.toHaveBeenCalled();
});
it("publishes only a change marker and tolerates disabled storage", () => {
  notifySessionChange();
  expect(localStorage.setItem).toHaveBeenCalledWith("mmm:session-change", expect.any(String));
  vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("Storage disabled"); });
  expect(notifySessionChange).not.toThrow();
});
