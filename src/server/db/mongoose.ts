import "server-only";

import mongoose, { type Mongoose } from "mongoose";

import { getDatabaseEnv } from "@/config/env";
import { AppError } from "@/server/http/app-error";

type MongooseCache = {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalForMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalForMongoose.mongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.promise) {
    let env;
    try { env = getDatabaseEnv(); }
    catch { throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Account service is not configured." }); }
    const { MONGODB_DB_NAME, MONGODB_URI } = env;
    cache.promise = mongoose
      .connect(MONGODB_URI, { dbName: MONGODB_DB_NAME, serverSelectionTimeoutMS: 5000 })
      .catch(() => {
        cache.promise = null;
        throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Account service is temporarily unavailable. Please try again." });
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
