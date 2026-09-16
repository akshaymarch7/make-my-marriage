import { z } from "zod";
import { getPublicGuestInvitation } from "@/modules/guests/invitation-service";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return authBoundary(async () => { validateAuthRequest(request); const { token } = z.object({ token: z.string() }).strict().parse(await context.params); return successResponse(await getPublicGuestInvitation(token)); });
}
