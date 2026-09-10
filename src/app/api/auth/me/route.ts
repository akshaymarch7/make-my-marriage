import { currentAccount } from "@/modules/auth/service";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";

export async function GET(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await currentAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    const wedding = account.wedding;
    return successResponse({ user: account.user, membership: account.membership, wedding: wedding ? {
      id: wedding.id, brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate,
    } : null });
  });
}
