import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { users } from "../src/db/schema/users";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    DEV_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),
  })
  .parse(process.env);

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const database = drizzle(client);

  await database
    .insert(users)
    .values({
      id: env.DEV_USER_ID,
      name: "Development Learner",
      email: "learner@talk-craft.local",
      englishLevel: "intermediate",
    })
    .onConflictDoNothing({ target: users.id });

  await client.end();
}

main().catch((error: unknown) => {
  console.error("Development seed failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
