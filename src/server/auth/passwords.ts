import "server-only";
import { hash, verify, argon2id } from "argon2";

export const hashPassword = (password: string) => hash(password, { type: argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (encoded: string, password: string) => verify(encoded, password);
// Unknown accounts still perform password verification to reduce timing disclosure.
let dummyHash: Promise<string> | undefined;
export function getDummyHash() { return dummyHash ??= hashPassword("unused-account-verification-password"); }
