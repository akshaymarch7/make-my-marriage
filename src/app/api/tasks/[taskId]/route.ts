import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedAccount } from "@/modules/auth/service";
import { getTask, updateTask, deleteTask } from "@/modules/tasks/service";
import { objectIdSchema } from "@/server/db/object-id";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
type Context = { params: Promise<{ taskId: string }> };
async function handle(request: Request, context: Context, method: "GET" | "PATCH" | "DELETE") {
  return authBoundary(async () => {
    validateAuthRequest(request);
    const account = await authenticatedAccount();
    if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
    const { taskId } = z.object({ taskId: objectIdSchema }).strict().parse(await context.params);
    if (method === "GET") return successResponse(await getTask(account.user.id, taskId));
    if (method === "PATCH") return successResponse(await updateTask(account.user.id, taskId, await readAuthBody(request)));
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    // Delete endpoint retains the documented { success: true } shape.
    return NextResponse.json(await deleteTask(account.user.id, taskId));
  });
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const PATCH = (request: Request, context: Context) => handle(request, context, "PATCH");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
