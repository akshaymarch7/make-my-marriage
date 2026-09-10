import "server-only";

import { z } from "zod";
import { AppError } from "@/server/http/app-error";

const databaseEnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default("make-my-marriage"),
});

const authEnvSchema = z.object({
  AUTH_TOKEN_PEPPER: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("mmm_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;

let cachedDatabaseEnv: DatabaseEnv | undefined;
let cachedAuthEnv: AuthEnv | undefined;

export function getDatabaseEnv(): DatabaseEnv {
  cachedDatabaseEnv ??= databaseEnvSchema.parse(process.env);
  return cachedDatabaseEnv;
}

export function getAuthEnv(): AuthEnv {
  if (!cachedAuthEnv) {
    const result = authEnvSchema.safeParse(process.env);
    if (!result.success) throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Account service is not configured." });
    cachedAuthEnv = result.data;
  }
  return cachedAuthEnv;
}
