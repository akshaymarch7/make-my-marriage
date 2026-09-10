import { login } from "@/modules/auth/service";
import { loginSchema, normalizeEmail } from "@/modules/auth/schemas";
import { authBoundary, validateAuthRequest, readAuthBody, setSessionCookie } from "@/server/auth/http";
import { limitAuth } from "@/server/auth/rate-limit";
import { successResponse } from "@/server/http/responses";

export async function POST(request: Request) {
  return authBoundary(async () => {
    validateAuthRequest(request);
    await limitAuth("login");
    const input = loginSchema.parse(await readAuthBody(request));
    await limitAuth("login", normalizeEmail(input.email));
    const { session, ...data } = await login(input);
    const response = successResponse(data);
    setSessionCookie(response, session);
    return response;
  });
}
