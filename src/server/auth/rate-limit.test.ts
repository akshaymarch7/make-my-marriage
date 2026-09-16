import { beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const db = vi.hoisted(() => ({ init: vi.fn(), findOneAndUpdate: vi.fn(), connect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: db.connect }));
vi.mock("@/config/env", () => ({ getAuthEnv: () => ({ AUTH_TOKEN_PEPPER: "test-pepper" }) }));
vi.mock("mongoose", async importOriginal => { const original = await importOriginal<typeof import("mongoose")>(); return { ...original, default: { models: { AuthRateLimit: db } } }; });
import { limitGuestRsvp } from "./rate-limit";
beforeEach(() => { vi.clearAllMocks(); db.findOneAndUpdate.mockResolvedValue({ count: 1 }); });
it("stores HMAC counter keys with separate global and per-link windows", async () => {
  const now = 1_800_000_000_000; const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  try { const token = "a".repeat(43); await limitGuestRsvp(token);
    const hash = (value: string) => createHmac("sha256", "test-pepper").update(value).digest("hex");
    expect(db.findOneAndUpdate.mock.calls[1][0]).toEqual({ _id: hash(`global:guest-rsvp:${Math.floor(now / 60000)}`) });
    expect(db.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: hash(`guest-rsvp:${token}:${Math.floor(now / 900000)}`) });
    expect(JSON.stringify(db.findOneAndUpdate.mock.calls)).not.toContain(token);
  } finally { clock.mockRestore(); }
});
it("permits the twentieth per-link attempt and rejects the twenty-first", async () => {
  db.findOneAndUpdate.mockResolvedValueOnce({ count: 20 }).mockResolvedValueOnce({ count: 300 }); await expect(limitGuestRsvp("a".repeat(43))).resolves.toBeUndefined();
  db.findOneAndUpdate.mockClear();
  db.findOneAndUpdate.mockResolvedValueOnce({ count: 21 }); await expect(limitGuestRsvp("a".repeat(43))).rejects.toMatchObject({ category: "RATE_LIMITED" }); expect(db.findOneAndUpdate).toHaveBeenCalledTimes(1);
});
it("stops at the global ceiling and handles a concurrent counter insert", async () => {
  db.findOneAndUpdate.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 301 }); await expect(limitGuestRsvp("a".repeat(43))).rejects.toMatchObject({ category: "RATE_LIMITED" }); expect(db.findOneAndUpdate).toHaveBeenCalledTimes(2);
  db.findOneAndUpdate.mockReset().mockRejectedValueOnce({ code: 11000 }).mockResolvedValue({ count: 1 }); await limitGuestRsvp("a".repeat(43)); expect(db.findOneAndUpdate.mock.calls[1][2]).toEqual({ returnDocument: "after" });
});
