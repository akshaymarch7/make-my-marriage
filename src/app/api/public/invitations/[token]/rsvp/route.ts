import { z } from "zod";
import { submitGuestRsvp } from "@/modules/guests/invitation-service";
import { guestInvitationTokenSchema, rsvpInputSchema } from "@/modules/guests/invitation-schemas";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return authBoundary(async () => { validateAuthRequest(request); const { token } = z.object({ token: guestInvitationTokenSchema }).strict().parse(await context.params); const input = rsvpInputSchema.parse(await readAuthBody(request)); return successResponse(await submitGuestRsvp(token, input)); });
}
