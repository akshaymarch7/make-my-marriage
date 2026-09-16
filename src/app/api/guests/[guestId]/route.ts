import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedAccount } from "@/modules/auth/service";
import { getGuest, updateGuest, deleteGuest } from "@/modules/guests/service";
import { objectIdSchema } from "@/server/db/object-id";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
type Context = { params: Promise<{ guestId: string }> };
async function handle(request: Request, context: Context, method: "GET" | "PATCH" | "DELETE") {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await authenticatedAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    const { guestId } = z.object({ guestId: objectIdSchema }).strict().parse(await context.params);
    if (method === "GET") return successResponse(await getGuest(account.user.id, guestId));
    if (method === "PATCH") return successResponse(await updateGuest(account.user.id, guestId, await readAuthBody(request)));
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    // Delete endpoint retains the documented { success: true } shape.
    return NextResponse.json(await deleteGuest(account.user.id, guestId));
  });
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const PATCH = (request: Request, context: Context) => handle(request, context, "PATCH");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
