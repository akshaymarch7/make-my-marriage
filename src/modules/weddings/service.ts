import "server-only";
import { createWeddingSchema, updateWeddingSchema } from "./schemas";
import { weddingSlug } from "./slug";
import { initializeWeddings, insertWedding, findWedding, patchWedding } from "./repository";
import { createAdminMembership, findMembership, initializeMemberships } from "@/modules/memberships/repository";
import { generateSecureToken } from "@/server/auth/tokens";
import { objectIdSchema } from "@/server/db/object-id";
import { AppError } from "@/server/http/app-error";

const alreadyHasWedding = () => new AppError({ category: "CONFLICT", code: "ALREADY_HAS_WEDDING", message: "You already belong to a wedding. Open your wedding overview to continue." });

export async function updateWedding(userId: string, input: unknown) {
  objectIdSchema.parse(userId);
  const changes = updateWeddingSchema.parse(input);
  const membership = await findMembership(userId);
  if (!membership) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  if (!["ADMIN", "MANAGER"].includes(membership.role)) throw new AppError({ category: "FORBIDDEN", message: "You cannot edit this wedding." });
  const existing = await findWedding(membership.weddingId);
  if (!existing) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  if (changes.location) {
    const location = { ...existing.location, ...changes.location };
    if (!location.formattedAddress?.trim() && !location.city?.trim()) throw new AppError({ category: "VALIDATION_ERROR", message: "Enter your wedding city or location.", details: { "location.formattedAddress": "Enter your wedding city or location." } });
  }
  if (!await patchWedding(membership.weddingId, changes)) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  const wedding = await findWedding(membership.weddingId);
  if (!wedding) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  return wedding;
}

export async function getWeddingContext(userId: string) {
  const membership = await findMembership(userId);
  if (!membership) return { membership: null, wedding: null };
  const wedding = await findWedding(membership.weddingId);
  if (!wedding) throw new AppError({ category: "NOT_FOUND", message: "Wedding not found." });
  return { membership: { role: membership.role }, wedding };
}

export async function createWedding(userId: string, input: unknown) {
  objectIdSchema.parse(userId);
  const data = createWeddingSchema.parse(input);
  if (await findMembership(userId)) throw alreadyHasWedding();
  const connection = await initializeWeddings();
  await initializeMemberships();
  // Initialize collections and indexes before entering a transaction.
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return await connection.transaction(async session => {
        if (await findMembership(userId, session)) throw alreadyHasWedding();
        const wedding = await insertWedding(data, userId, (attempt < 19 ? weddingSlug(data.brideName, data.groomName, data.weddingDate, attempt) : `${weddingSlug(data.brideName, data.groomName, data.weddingDate)}-${generateSecureToken(8)}`), generateSecureToken(), session);
        await createAdminMembership(userId, wedding.id, session);
        return wedding;
      });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
      // A concurrent request may have won the unique membership constraint.
      if (await findMembership(userId)) throw alreadyHasWedding();
      if (!("keyPattern" in error && error.keyPattern && typeof error.keyPattern === "object" && "website.slug" in error.keyPattern)) throw error;
      // A slug collision rolls back the whole transaction; retry with a suffix.
    }
  }
  throw new AppError({ category: "CONFLICT", message: "We couldn’t reserve a wedding address. Please try again." });
}
