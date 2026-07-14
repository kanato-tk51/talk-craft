import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

async function main() {
  const client = postgres(databaseUrl as string, { max: 1 });
  const database = drizzle(client);

  await migrate(database, { migrationsFolder: "drizzle" });
  await client.end();
}

main().catch((error: unknown) => {
  console.error("Database migration failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
