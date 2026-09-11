import "server-only";
import { User } from "./user.model";
import { connectToDatabase } from "@/server/db/mongoose";
import { objectIdSchema } from "@/server/db/object-id";

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

export async function findPublicUsersByIds(ids: string[]) {
  ids.forEach(id => objectIdSchema.parse(id));
  await connectToDatabase();
  const users = await User.find({ _id: { $in: ids } }).select("name email").lean();
  return users.map(user => ({ id: user._id.toString(), name: user.name, email: user.email }));
}
