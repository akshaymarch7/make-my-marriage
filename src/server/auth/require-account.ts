import "server-only";
import { authenticatedAccount } from "@/modules/auth/service";
import { AppError } from "@/server/http/app-error";

export async function requireAccount() {
  const account = await authenticatedAccount();
  if (!account) throw new AppError({ category: "UNAUTHENTICATED", message: "Please sign in." });
  return account;
}
