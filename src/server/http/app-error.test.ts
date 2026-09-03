import { describe, expect, it } from "vitest";

import { AppError } from "./app-error";

describe("AppError", () => {
  it("derives the HTTP status from its category", () => {
    const error = new AppError({
      category: "NOT_FOUND",
      message: "Guest not found",
    });

    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("supports a domain code without changing HTTP semantics", () => {
    const error = new AppError({
      category: "CONFLICT",
      code: "LAST_ADMIN",
      message: "The last admin cannot be removed",
    });

    expect(error.status).toBe(409);
    expect(error.code).toBe("LAST_ADMIN");
  });
});
