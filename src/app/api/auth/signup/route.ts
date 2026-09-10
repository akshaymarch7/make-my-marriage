import { signup } from "@/modules/auth/service";
import { signupSchema, normalizeEmail } from "@/modules/auth/schemas";
import { authBoundary, validateAuthRequest, readAuthBody, setSessionCookie } from "@/server/auth/http";
import { limitAuth } from "@/server/auth/rate-limit";
import { successResponse } from "@/server/http/responses";

export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    await limitAuth("signup");
    const input = signupSchema.parse(await readAuthBody(request));
    await limitAuth("signup", normalizeEmail(input.email));
    const { session, ...data } = await signup(input);
    const response = successResponse(data, { status: 201 });
    setSessionCookie(response, session);
    return response;
  });
}
