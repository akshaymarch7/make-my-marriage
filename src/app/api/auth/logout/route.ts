import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedAccount } from "@/modules/auth/service";
import { authBoundary, validateAuthRequest, clearSessionCookie, readAuthBody } from "@/server/auth/http";
import { revokeSession } from "@/server/auth/sessions";

export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    z.object({}).strict().parse(await readAuthBody(request, { allowEmpty: true }));
    const account = await authenticatedAccount();
    if (account) await revokeSession(account.sessionId);
    const response = account ? NextResponse.json({ success: true }) : NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } }, { status: 401 });
    clearSessionCookie(response);
    return response;
  });
}
