import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";

import * as schema from "./schema";

export function createDatabaseClient(database: CloudflareEnv["DB"]) {
  return drizzle(database, { schema });
}

export const getDb = cache(() => {
  const database = getCloudflareContext().env.DB;
  if (!database) {
    throw new Error("Cloudflare D1 binding DB is unavailable.");
  }

  return createDatabaseClient(database);
});
