import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? undefined : value),
    z.string().trim().min(1).optional(),
  ),
  DEV_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cachedEnv: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEV_USER_ID: process.env.DEV_USER_ID,
    APP_ENV: process.env.APP_ENV,
  });

  return cachedEnv;
}
