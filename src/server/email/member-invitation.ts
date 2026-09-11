import "server-only";
import { z } from "zod";
import { AppError } from "@/server/http/app-error";

export function getInvitationEmailConfig() {
  const result = z.object({
    RESEND_API_KEY: z.string().trim().min(1),
    RESEND_FROM_EMAIL: z.string().trim().min(1).refine(value => !/[\r\n]/.test(value) && !value.includes("example.com")),
    NEXT_PUBLIC_APP_URL: z.url().refine(value => ["http:", "https:"].includes(new URL(value).protocol)),
  }).safeParse(process.env);
  if (!result.success) throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Invitation email is not configured yet. Please try again once email delivery is set up." });
  return result.data;
}

export async function sendMemberInvitationEmail(input: { id: string; email: string; token: string; brideName: string; groomName: string; role: string; expiresAt: string }) {
  const env = getInvitationEmailConfig();
  const url = new URL(`/member-invitations/${input.token}`, env.NEXT_PUBLIC_APP_URL).href;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `member-invitation/${input.id}` },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [input.email], subject: "You're invited to a wedding workspace", text: `Join ${input.brideName} & ${input.groomName} on Make My Marriage as ${input.role === "ADMIN" ? "an Admin" : "a Manager"}.\n\nSign in or create an account using ${input.email}, then accept your invitation:\n${url}\n\nThis invitation expires on ${new Date(input.expiresAt).toUTCString()}.\nIf you weren't expecting this invitation, you can ignore this email.` }),
    });
    if (!response.ok || !z.object({ id: z.string().min(1) }).safeParse(await response.json()).success) throw new Error("Email send failed");
  } catch {
    // Provider payloads may contain recipients or secrets. Never log or return them.
    throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "We couldn’t confirm the invitation email was sent. Please try again. Any link from this attempt is no longer valid." });
  }
}
