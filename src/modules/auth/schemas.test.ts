import { expect, it } from "vitest";
import { signupSchema, loginSchema, normalizeEmail } from "./schemas";
it("normalizes case and whitespace but preserves email dots and aliases", () => {
  expect(normalizeEmail(" A.B+tag@Example.com ")).toBe("a.b+tag@example.com");
});
it.each([signupSchema, loginSchema])("explains the password maximum in plain language", schema => {
  const result = schema.safeParse({ ...(schema === signupSchema ? { name: "Person" } : {}), email: "person@example.com", password: "a".repeat(129) });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues.find(issue => issue.path[0] === "password")?.message).toBe("Use no more than 128 characters for your password.");
});
it("preserves password whitespace and rejects weak or oversized input", () => {
  const input = { name: "Person", email: "person@example.com", password: "  password with spaces  " };
  expect(signupSchema.parse(input).password).toBe(input.password);
  for (const password of ["short", "a".repeat(129)]) expect(signupSchema.safeParse({ ...input, password }).success).toBe(false);
  expect(signupSchema.safeParse({ ...input, weddingId: "other" }).success).toBe(false);
});
