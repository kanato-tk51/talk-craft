import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { users } from "../src/db/schema/users";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    DEV_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),
    APP_USER_ID: z.uuid().optional(),
    AUTHORIZED_EMAIL: z.email().optional(),
    APP_USER_NAME: z.string().trim().min(1).max(120).default("Talk Craft Learner"),
  })
  .superRefine((value, context) => {
    if (value.APP_ENV === "production" && !value.APP_USER_ID) {
      context.addIssue({
        code: "custom",
        path: ["APP_USER_ID"],
        message: "APP_USER_ID is required in production.",
      });
    }
    if (value.APP_ENV === "production" && !value.AUTHORIZED_EMAIL) {
      context.addIssue({
        code: "custom",
        path: ["AUTHORIZED_EMAIL"],
        message: "AUTHORIZED_EMAIL is required in production.",
      });
    }
  })
  .parse(process.env);

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const database = drizzle(client);
  const userId = env.APP_ENV === "production" ? env.APP_USER_ID : env.DEV_USER_ID;
  const email = env.APP_ENV === "production" ? env.AUTHORIZED_EMAIL : "learner@talk-craft.local";

  if (!userId || !email) {
    throw new Error("User seed configuration is incomplete.");
  }

  await database
    .insert(users)
    .values({
      id: userId,
      name: env.APP_ENV === "production" ? env.APP_USER_NAME : "Development Learner",
      email,
      englishLevel: "intermediate",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: env.APP_ENV === "production" ? env.APP_USER_NAME : "Development Learner",
        email,
        updatedAt: new Date(),
      },
    });

  await client.end();
}

main().catch((error: unknown) => {
  console.error("Development seed failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
