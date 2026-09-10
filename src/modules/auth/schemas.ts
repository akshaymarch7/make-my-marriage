import { z } from "zod";

const email = z.string().trim().max(254).email("Enter a valid email address.");
const password = z.string().min(1, "Enter your password.").max(128, "Use no more than 128 characters for your password.");
export const loginSchema = z.object({ email, password }).strict();
export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Enter your name (at least 2 characters).").max(100),
  password: password.min(12, "Use at least 12 characters."),
});
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
