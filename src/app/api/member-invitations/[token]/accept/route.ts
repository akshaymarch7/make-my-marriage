import { z } from "zod";
import { requireAccount } from "@/server/auth/require-account";
import { authBoundary, readAuthBody, validateAuthRequest } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
import { acceptInvitation } from "@/modules/memberships/service";
import { invitationTokenSchema } from "@/modules/memberships/schemas";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    const { token } = z.object({ token: invitationTokenSchema }).strict().parse(await context.params);
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    return successResponse(await acceptInvitation(account.user, token));
  });
}
