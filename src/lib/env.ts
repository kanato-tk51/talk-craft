import { z } from "zod";

const serverEnvSchema = z.object({
  DEV_USER_ID: z.uuid().default("00000000-0000-4000-8000-000000000001"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTHORIZED_EMAIL: z.string().optional(),
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: z.string().optional(),
  CLOUDFLARE_ACCESS_AUD: z.string().optional(),
});

let cachedEnv: z.infer<typeof serverEnvSchema> | undefined;

const productionAuthEnvSchema = z.object({
  AUTHORIZED_EMAIL: z.email().transform((email) => email.toLocaleLowerCase("en-US")),
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname.endsWith(".cloudflareaccess.com") &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    }, "Cloudflare Accessのteam domainをhttps://<team>.cloudflareaccess.com形式で指定してください")
    .transform((value) => value.replace(/\/$/, "")),
  CLOUDFLARE_ACCESS_AUD: z.string().min(1),
});

export function getServerEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = serverEnvSchema.parse({
    DEV_USER_ID: process.env.DEV_USER_ID,
    APP_ENV: process.env.APP_ENV,
    AUTHORIZED_EMAIL: process.env.AUTHORIZED_EMAIL,
    CLOUDFLARE_ACCESS_TEAM_DOMAIN: process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
    CLOUDFLARE_ACCESS_AUD: process.env.CLOUDFLARE_ACCESS_AUD,
  });

  return cachedEnv;
}

export function getProductionAuthEnv() {
  const env = getServerEnv();
  if (env.APP_ENV !== "production") {
    throw new Error("Production authentication configuration is unavailable outside production.");
  }

  return productionAuthEnvSchema.parse(env);
}
