import { requireAccount } from "@/server/auth/require-account";
import { authBoundary, readAuthBody, validateAuthRequest } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
import { inviteMember, listInvitations } from "@/modules/memberships/service";

export async function GET(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    return successResponse(await listInvitations(account.user.id));
  });
}
export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    return successResponse(await inviteMember(account.user.id, await readAuthBody(request)), { status: 201 });
  });
}
