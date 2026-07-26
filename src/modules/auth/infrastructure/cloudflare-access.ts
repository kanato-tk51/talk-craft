import { createRemoteJWKSet, type JWTVerifyGetKey, errors as joseErrors, jwtVerify } from "jose";
import { z } from "zod";

const emailClaimSchema = z.email();

export type CloudflareAccessConfig = {
  teamDomain: string;
  audience: string;
  authorizedEmail: string;
};

export class CloudflareAccessAuthenticationError extends Error {
  constructor(message = "Cloudflare Access authentication failed.") {
    super(message);
    this.name = "CloudflareAccessAuthenticationError";
  }
}

const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function getRemoteKeySet(teamDomain: string): JWTVerifyGetKey {
  const existing = remoteKeySets.get(teamDomain);
  if (existing) {
    return existing;
  }

  const keySet = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  remoteKeySets.set(teamDomain, keySet);
  return keySet;
}

export async function verifyCloudflareAccessToken(
  token: string | null,
  config: CloudflareAccessConfig,
  keySet: JWTVerifyGetKey = getRemoteKeySet(config.teamDomain),
): Promise<{ email: string }> {
  if (!token) {
    throw new CloudflareAccessAuthenticationError();
  }

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: config.teamDomain,
      audience: config.audience,
      algorithms: ["RS256"],
    });
    const parsedEmail = emailClaimSchema.safeParse(payload.email);
    if (!parsedEmail.success) {
      throw new CloudflareAccessAuthenticationError();
    }

    const email = parsedEmail.data.toLocaleLowerCase("en-US");
    if (email !== config.authorizedEmail.toLocaleLowerCase("en-US")) {
      throw new CloudflareAccessAuthenticationError();
    }

    return { email };
  } catch (error) {
    if (error instanceof CloudflareAccessAuthenticationError) {
      throw error;
    }
    if (error instanceof joseErrors.JOSEError) {
      throw new CloudflareAccessAuthenticationError();
    }
    throw error;
  }
}
