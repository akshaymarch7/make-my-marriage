import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthEnv } from "@/config/env";
import { AppError } from "@/server/http/app-error";
import { errorResponse } from "@/server/http/responses";
import { sessionCookieOptions } from "./sessions";

export function validateAuthRequest(request: Request) {
  z.object({}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  if (request.method === "GET") return;
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Account service is not configured." });
  if (request.headers.get("origin") !== new URL(configured).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AppError({ category: "FORBIDDEN", message: "Request origin is not allowed." });
  }
}
export async function readAuthBody(request: Request, { allowEmpty = false } = {}) {
  const reader = request.body?.getReader();
  if (!reader && allowEmpty) return {};
  if (!reader) throw new AppError({ category: "VALIDATION_ERROR", message: "A request body is required." });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new AppError({ category: "VALIDATION_ERROR", message: "Request body is too large." }); }
    chunks.push(value);
  }
  // Next.js can expose a stream even when a POST contains zero body bytes.
  if (size === 0 && allowEmpty) return {};
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new AppError({ category: "VALIDATION_ERROR", message: "Send a JSON request body." });
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new AppError({ category: "VALIDATION_ERROR", message: "Invalid JSON." }); }
}
export function setSessionCookie(response: NextResponse, session: { token: string; expiresAt: Date }) {
  response.cookies.set(getAuthEnv().SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt));
}
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getAuthEnv().SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}
export async function authBoundary(work: () => Promise<NextResponse>) {
  let response;
  try { response = await work(); } catch (error) { response = errorResponse(error); }
  response.headers.set("Cache-Control", "no-store");
  if (response.status === 429) response.headers.set("Retry-After", "900");
  return response;
}
