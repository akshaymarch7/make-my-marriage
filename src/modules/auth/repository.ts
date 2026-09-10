import "server-only";
import { User } from "./user.model";
import { connectToDatabase } from "@/server/db/mongoose";

export async function findUserByEmail(emailNormalized: string) {
  await connectToDatabase();
  return User.findOne({ emailNormalized }).select("+passwordHash").lean();
}
export async function findUserById(id: string) {
  await connectToDatabase();
  return User.findById(id).lean();
}
export async function createUser(input: { name: string; email: string; emailNormalized: string; passwordHash: string }) {
  await connectToDatabase();
  // Ensure uniqueness is enforced even on a freshly created development database.
  await User.init();
  return User.create(input);
}
