import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().max(254, "Use no more than 254 characters.").email("Enter a valid email address.").transform(value => value.toLowerCase()),
  role: z.enum(["ADMIN", "MANAGER"]),
}).strict();
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid invitation link.");
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export const changeMemberRoleSchema = z.object({ role: z.enum(["ADMIN", "MANAGER"]) }).strict();
