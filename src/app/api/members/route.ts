import { requireAccount } from "@/server/auth/require-account";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { successResponse } from "@/server/http/responses";
import { listMembers } from "@/modules/memberships/service";

export async function GET(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await requireAccount();
    return successResponse(await listMembers(account.user.id));
  });
}
