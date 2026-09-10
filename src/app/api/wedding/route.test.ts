import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { currentAccount } from "@/modules/auth/service";
import { createWedding } from "@/modules/weddings/service";
vi.mock("@/modules/auth/service", () => ({ currentAccount: vi.fn() }));
vi.mock("@/modules/weddings/service", () => ({ createWedding: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); });
afterEach(() => vi.unstubAllEnvs());
it("requires authentication before wedding creation", async () => {
  vi.mocked(currentAccount).mockResolvedValue(null);
  const response = await POST(new Request("http://localhost:3000/api/wedding", { method: "POST", headers: { origin: "http://localhost:3000" } }));
  expect(response.status).toBe(401);
  expect(createWedding).not.toHaveBeenCalled();
});
it("does not accept another wedding's ID in query parameters", async () => {
  const response = await GET(new Request("http://localhost:3000/api/wedding?weddingId=other"));
  expect(response.status).toBe(400);
  expect(currentAccount).not.toHaveBeenCalled();
});
it("returns only the current account's wedding", async () => {
  vi.mocked(currentAccount).mockResolvedValue({ wedding: { id: "own-wedding" } } as never);
  const response = await GET(new Request("http://localhost:3000/api/wedding"));
  expect(await response.json()).toEqual({ data: { id: "own-wedding" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
