import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  sqlClient?: postgres.Sql;
};

export const sqlClient =
  globalForDb.sqlClient ??
  postgres(env.DATABASE_URL, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = sqlClient;
}

export const db = drizzle(sqlClient, { schema });

