import "server-only";
import { getPublicInvitation } from "@/modules/memberships/service";
import { invitationReturnTo } from "@/modules/auth/return-to";
import { AppError } from "@/server/http/app-error";

export async function invitedEmailForAuth(returnTo?: string) {
  const path = invitationReturnTo({ next: returnTo });
  if (!path) return undefined;
  try {
    return (await getPublicInvitation(path.split("/").at(-1)!)).email;
  } catch (error) {
    // A stale invitation must not prevent someone from accessing their account.
    if (error instanceof AppError && ["INVALID_TOKEN", "TOKEN_EXPIRED", "INVITATION_ALREADY_ACCEPTED"].includes(error.code)) return undefined;
    throw error;
  }
}
