import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getInvitationEmailConfig, sendMemberInvitationEmail } from "./member-invitation";
const input = { id: "invitation-id", email: "person@example.com", token: "t".repeat(43), brideName: "A", groomName: "B", role: "MANAGER", expiresAt: "2027-01-01T00:00:00Z" };
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("RESEND_FROM_EMAIL", "Wedding <wedding@verified.test>"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wedding.test");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "mail-id" }))));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("uses the provider's fixed endpoint, idempotency key, and plain text invitation link", async () => {
  await sendMemberInvitationEmail(input);
  const [url, request] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  expect(request!.headers).toMatchObject({ "Idempotency-Key": "member-invitation/invitation-id" });
  const body = JSON.parse(request!.body as string);
  expect(body.to).toEqual([input.email]); expect(body.text).toContain(`https://wedding.test/member-invitations/${input.token}`);
});
it("reports missing configuration without sending", () => {
  vi.stubEnv("RESEND_API_KEY", ""); expect(getInvitationEmailConfig).toThrow("not configured"); expect(fetch).not.toHaveBeenCalled();
});
it.each([false, true])("sanitizes provider failures (network: %s)", async network => {
  if (network) vi.mocked(fetch).mockRejectedValue(new Error("provider-secret"));
  else vi.mocked(fetch).mockResolvedValue(new Response("provider-secret", { status: 500 }));
  await expect(sendMemberInvitationEmail(input)).rejects.toMatchObject({ code: "EXTERNAL_SERVICE_ERROR" });
  await expect(sendMemberInvitationEmail(input)).rejects.not.toThrow("provider-secret");
});
