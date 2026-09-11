import { z } from "zod";
import { changeMemberRole, removeMember } from "@/modules/memberships/service";
import { authBoundary, readAuthBody, validateAuthRequest } from "@/server/auth/http";
import { requireAccount } from "@/server/auth/require-account";
import { objectIdSchema } from "@/server/db/object-id";
import { noContentResponse, successResponse } from "@/server/http/responses";

type Context = { params: Promise<{ membershipId: string }> };
const paramsSchema = z.object({ membershipId: objectIdSchema }).strict();
export async function PATCH(request: Request, context: Context) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    const { membershipId } = paramsSchema.parse(await context.params);
    return successResponse(await changeMemberRole(account.user.id, membershipId, await readAuthBody(request)));
  });
}
export async function DELETE(request: Request, context: Context) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    const { membershipId } = paramsSchema.parse(await context.params);
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    await removeMember(account.user.id, membershipId);
    return noContentResponse();
  });
}
