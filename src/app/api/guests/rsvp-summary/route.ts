import { authenticatedAccount } from "@/modules/auth/service";
import { getRsvpSummary } from "@/modules/guests/invitation-service";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
export async function GET(request: Request) {
  return authBoundary(async () => { validateAuthRequest(request); const account = await authenticatedAccount(); if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." }); return successResponse(await getRsvpSummary(account.user.id)); });
}
