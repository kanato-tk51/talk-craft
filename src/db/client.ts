import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as {
  sqlClient: ReturnType<typeof postgres> | undefined;
};

const sqlClient =
  globalForDatabase.sqlClient ??
  postgres(getServerEnv().DATABASE_URL, {
    max: getServerEnv().APP_ENV === "development" ? 5 : 10,
    prepare: false,
  });

if (getServerEnv().APP_ENV !== "production") {
  globalForDatabase.sqlClient = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
export { sqlClient };
