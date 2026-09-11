import { z } from "zod";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
import { getPublicInvitation } from "@/modules/memberships/service";
import { invitationTokenSchema } from "@/modules/memberships/schemas";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const { token } = z.object({ token: invitationTokenSchema }).strict().parse(await context.params);
    return successResponse(await getPublicInvitation(token));
  });
}
