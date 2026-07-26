import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

export function createDatabaseClient(connectionString = getServerEnv().DATABASE_URL) {
  const sqlClient = postgres(connectionString, {
    max: getServerEnv().APP_ENV === "development" ? 5 : 1,
    prepare: false,
    fetch_types: false,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  return {
    db: drizzle(sqlClient, { schema }),
    sqlClient,
  };
}

export const getDb = cache(() => createDatabaseClient().db);
