import { authenticatedAccount } from "@/modules/auth/service";
import { createEvent, listEvents } from "@/modules/events/service";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
export async function GET(request: Request) {
  return authBoundary(async () => {
    const account = await authenticatedAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    return successResponse(await listEvents(account.user.id, Object.fromEntries(new URL(request.url).searchParams)));
  });
}
export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await authenticatedAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    return successResponse(await createEvent(account.user.id, await readAuthBody(request)), { status: 201 });
  });
}
