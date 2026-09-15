import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedAccount } from "@/modules/auth/service";
import { getEvent, updateEvent, archiveEvent } from "@/modules/events/service";
import { objectIdSchema } from "@/server/db/object-id";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
type Context = { params: Promise<{ eventId: string }> };
async function handle(request: Request, context: Context, method: "GET" | "PATCH" | "DELETE") {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await authenticatedAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    const { eventId } = z.object({ eventId: objectIdSchema }).strict().parse(await context.params);
    if (method === "GET") return successResponse(await getEvent(account.user.id, eventId));
    if (method === "PATCH") return successResponse(await updateEvent(account.user.id, eventId, await readAuthBody(request)));
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    // Archive endpoint retains the documented { success: true } shape.
    return NextResponse.json(await archiveEvent(account.user.id, eventId));
  });
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const PATCH = (request: Request, context: Context) => handle(request, context, "PATCH");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
