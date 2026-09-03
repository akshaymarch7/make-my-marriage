import "server-only";

import mongoose, { type Mongoose } from "mongoose";

import { getDatabaseEnv } from "@/config/env";

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
    const { MONGODB_DB_NAME, MONGODB_URI } = getDatabaseEnv();
    cache.promise = mongoose
      .connect(MONGODB_URI, { dbName: MONGODB_DB_NAME })
      .catch((error: unknown) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
