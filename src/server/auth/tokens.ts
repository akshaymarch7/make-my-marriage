import "server-only";

import { createHmac, randomBytes } from "node:crypto";

export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
