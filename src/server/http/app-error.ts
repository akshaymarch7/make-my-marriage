export const APP_ERROR_CATEGORIES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "RATE_LIMITED",
  "UPLOAD_ERROR",
  "EXTERNAL_SERVICE_ERROR",
  "INTERNAL_ERROR",
] as const;

export type AppErrorCategory = (typeof APP_ERROR_CATEGORIES)[number];
export type ErrorDetails = Record<string, string | string[]>;

const HTTP_STATUS_BY_CATEGORY: Record<AppErrorCategory, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TOKEN: 400,
  TOKEN_EXPIRED: 400,
  RATE_LIMITED: 429,
  UPLOAD_ERROR: 400,
  EXTERNAL_SERVICE_ERROR: 503,
  INTERNAL_ERROR: 500,
};

type AppErrorOptions = {
  category: AppErrorCategory;
  message: string;
  code?: string;
  details?: ErrorDetails;
};

export class AppError extends Error {
  public readonly category: AppErrorCategory;
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ErrorDetails;

  constructor({ category, code = category, details, message }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.category = category;
    this.code = code;
    this.status = HTTP_STATUS_BY_CATEGORY[category];
    this.details = details;
  }
}
