import "server-only";
import { createUser, findUserByEmail, findUserById } from "./repository";
import { loginSchema, signupSchema, normalizeEmail } from "./schemas";
import { hashPassword, verifyPassword, getDummyHash } from "@/server/auth/passwords";
import { createSession, readSession } from "@/server/auth/sessions";
import { AppError } from "@/server/http/app-error";
import { getWeddingContext } from "@/modules/weddings/service";

function publicUser(user: { _id: { toString(): string }; name: string; email: string }) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}
const duplicateEmail = () => new AppError({ category: "CONFLICT", code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists. Please sign in." });
export async function signup(input: unknown) {
  const data = signupSchema.parse(input);
  const emailNormalized = normalizeEmail(data.email);
  if (await findUserByEmail(emailNormalized)) throw duplicateEmail();
  const passwordHash = await hashPassword(data.password);
  let user;
  try { user = await createUser({ name: data.name, email: data.email, emailNormalized, passwordHash }); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw duplicateEmail();
    throw error;
  }
  // If session creation fails, the account remains usable through login.
  const session = await createSession(user._id.toString());
  return { user: publicUser(user), hasWedding: false, session };
}
export async function login(input: unknown) {
  const data = loginSchema.parse(input);
  const user = await findUserByEmail(normalizeEmail(data.email));
  const valid = await verifyPassword(user?.passwordHash ?? await getDummyHash(), data.password);
  if (!user || !valid) throw new AppError({ category: "UNAUTHENTICATED", message: "Invalid email or password." });
  const context = await getWeddingContext(user._id.toString());
  return { user: publicUser(user), hasWedding: Boolean(context.wedding), session: await createSession(user._id.toString()) };
}
export async function authenticatedAccount() {
  const session = await readSession();
  if (!session) return null;
  const user = await findUserById(session.userId.toString());
  if (!user) return null;
  return { user: publicUser(user), sessionId: session._id.toString() };
}
export async function currentAccount() {
  const account = await authenticatedAccount();
  return account ? { ...account, ...await getWeddingContext(account.user.id) } : null;
}
