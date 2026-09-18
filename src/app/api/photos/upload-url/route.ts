import { authenticatedAccount } from "@/modules/auth/service";
import { requestUpload } from "@/modules/photos/service";
import { authBoundary, validateAuthRequest, readAuthBody } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
import { successResponse } from "@/server/http/responses";
export async function POST(request: Request) { return authBoundary(async () => { validateAuthRequest(request); const account = await authenticatedAccount(); if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." }); return successResponse(await requestUpload(account.user.id, await readAuthBody(request)), { status: 201 }); }); }
