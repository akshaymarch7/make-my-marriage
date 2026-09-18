import { z } from "zod";
import { objectIdSchema } from "@/server/db/object-id";
import { authenticatedAccount } from "@/modules/auth/service";
import { removePhoto } from "@/modules/photos/service";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
export async function DELETE(request: Request, context: { params: Promise<{ photoId: string }> }) { return authBoundary(async () => { validateAuthRequest(request); const account = await authenticatedAccount(); if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." }); const { photoId } = z.object({ photoId: objectIdSchema }).strict().parse(await context.params); z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true })); return successResponse(await removePhoto(account.user.id, photoId)); }); }
