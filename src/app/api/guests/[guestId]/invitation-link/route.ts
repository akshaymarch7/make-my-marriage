import { z } from "zod";
import { authenticatedAccount } from "@/modules/auth/service";
import { getGuestInvitationLink } from "@/modules/guests/invitation-service";
import { objectIdSchema } from "@/server/db/object-id";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
export async function GET(request: Request, context: { params: Promise<{ guestId: string }> }) {
  return authBoundary(async () => { validateAuthRequest(request); const account = await authenticatedAccount(); if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." }); const { guestId } = z.object({ guestId: objectIdSchema }).strict().parse(await context.params); return successResponse(await getGuestInvitationLink(account.user.id, guestId)); });
}
