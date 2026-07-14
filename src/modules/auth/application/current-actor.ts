import { getServerEnv } from "@/lib/env";

export function getCurrentActorId(): string {
  const env = getServerEnv();

  if (env.APP_ENV === "production") {
    throw new Error(
      "Development actor fallback is disabled in production. Configure authentication first.",
    );
  }

  return env.DEV_USER_ID;
}
