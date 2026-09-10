import { currentAccount } from "@/modules/auth/service";
import { createWedding } from "@/modules/weddings/service";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";

export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await currentAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    return successResponse(await createWedding(account.user.id, await readAuthBody(request)), { status: 201 });
  });
}
export async function GET(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await currentAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    if (!account.wedding) throw new AppError({ category: "NOT_FOUND", message: "Create your wedding first." });
    return successResponse(account.wedding);
  });
}
