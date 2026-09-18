import { z } from "zod";
import { NextResponse } from "next/server";
import { objectIdSchema } from "@/server/db/object-id";
import { authenticatedAccount } from "@/modules/auth/service";
import { downloadPhoto } from "@/modules/photos/service";
import { authBoundary, validateAuthRequest } from "@/server/auth/http";
import { AppError } from "@/server/http/app-error";
export async function GET(request: Request, context: { params: Promise<{ photoId: string }> }) { return authBoundary(async () => { validateAuthRequest(request); const account = await authenticatedAccount(); if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." }); const { photoId } = z.object({ photoId: objectIdSchema }).strict().parse(await context.params); return NextResponse.json({ data: { url: await downloadPhoto(account.user.id, photoId) } }); }); }
