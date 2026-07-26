import { headers } from "next/headers";
import { cache } from "react";
import { getProductionAuthEnv, getServerEnv } from "@/lib/env";
import { verifyCloudflareAccessToken } from "../infrastructure/cloudflare-access";

export const getCurrentActorId = cache(async (): Promise<string> => {
  const env = getServerEnv();

  if (env.APP_ENV !== "production") {
    return env.DEV_USER_ID;
  }

  const authEnv = getProductionAuthEnv();
  const requestHeaders = await headers();
  await verifyCloudflareAccessToken(requestHeaders.get("cf-access-jwt-assertion"), {
    teamDomain: authEnv.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
    audience: authEnv.CLOUDFLARE_ACCESS_AUD,
    authorizedEmail: authEnv.AUTHORIZED_EMAIL,
  });

  return authEnv.APP_USER_ID;
});
