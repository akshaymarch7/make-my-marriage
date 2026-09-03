import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, type ErrorDetails } from "./app-error";

export function successResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: zodErrorDetails(error),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}

function zodErrorDetails(error: ZodError): ErrorDetails {
  const details: ErrorDetails = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    const current = details[path];
    details[path] = current
      ? [...(Array.isArray(current) ? current : [current]), issue.message]
      : issue.message;
  }

  return details;
}
