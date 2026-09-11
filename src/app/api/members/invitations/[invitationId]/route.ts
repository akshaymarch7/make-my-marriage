import { z } from "zod";
import { requireAccount } from "@/server/auth/require-account";
import { authBoundary, readAuthBody, validateAuthRequest } from "@/server/auth/http";
import { noContentResponse } from "@/server/http/responses";
import { objectIdSchema } from "@/server/db/object-id";
import { revokeInvitation } from "@/modules/memberships/service";

export async function DELETE(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    const { invitationId } = z.object({ invitationId: objectIdSchema }).strict().parse(await context.params);
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    await revokeInvitation(account.user.id, invitationId);
    return noContentResponse();
  });
}
