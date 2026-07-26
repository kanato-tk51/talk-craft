import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CloudflareAccessAuthenticationError,
  type CloudflareAccessConfig,
  verifyCloudflareAccessToken,
} from "./cloudflare-access";

const config: CloudflareAccessConfig = {
  teamDomain: "https://talk-craft-test.cloudflareaccess.com",
  audience: "talk-craft-audience",
  authorizedEmail: "learner@example.com",
};

let privateKey: CryptoKey;
let keySet: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256");
  privateKey = keyPair.privateKey;
  const publicJwk = await exportJWK(keyPair.publicKey);
  keySet = createLocalJWKSet({
    keys: [{ ...publicJwk, alg: "RS256", kid: "test-key", use: "sig" }],
  });
});

async function createToken(overrides: { email?: string; issuer?: string; audience?: string } = {}) {
  return new SignJWT({ email: overrides.email ?? config.authorizedEmail })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(overrides.issuer ?? config.teamDomain)
    .setAudience(overrides.audience ?? config.audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("verifyCloudflareAccessToken", () => {
  it("accepts a valid token for the configured email", async () => {
    const token = await createToken({ email: "Learner@example.com" });

    await expect(verifyCloudflareAccessToken(token, config, keySet)).resolves.toEqual({
      email: "learner@example.com",
    });
  });

  it("rejects a missing token", async () => {
    await expect(verifyCloudflareAccessToken(null, config, keySet)).rejects.toBeInstanceOf(
      CloudflareAccessAuthenticationError,
    );
  });

  it("rejects a token for another email", async () => {
    const token = await createToken({ email: "other@example.com" });

    await expect(verifyCloudflareAccessToken(token, config, keySet)).rejects.toBeInstanceOf(
      CloudflareAccessAuthenticationError,
    );
  });

  it("rejects a token for another Access application", async () => {
    const token = await createToken({ audience: "another-audience" });

    await expect(verifyCloudflareAccessToken(token, config, keySet)).rejects.toBeInstanceOf(
      CloudflareAccessAuthenticationError,
    );
  });

  it("rejects a token from another Access team", async () => {
    const token = await createToken({
      issuer: "https://another-team.cloudflareaccess.com",
    });

    await expect(verifyCloudflareAccessToken(token, config, keySet)).rejects.toBeInstanceOf(
      CloudflareAccessAuthenticationError,
    );
  });
});
