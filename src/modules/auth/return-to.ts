import { z } from "zod";

// Only the implemented invitation flow can supply a post-auth destination.
const querySchema = z.object({ next: z.string().regex(/^\/member-invitations\/[A-Za-z0-9_-]{43}$/).optional() }).strict();
export function invitationReturnTo(query: Record<string, string | string[] | undefined>) {
  const result = querySchema.safeParse(query);
  return result.success ? result.data.next : undefined;
}
