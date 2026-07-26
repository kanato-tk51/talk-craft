import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";

type EnsureUserInput = {
  email: string;
  name: string;
  preferredId?: string;
};

export async function ensureUser({ email, name, preferredId }: EnsureUserInput): Promise<string> {
  const db = getDb();
  const normalizedEmail = email.toLocaleLowerCase("en-US");
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({
      id: preferredId ?? crypto.randomUUID(),
      name,
      email: normalizedEmail,
      englishLevel: "intermediate",
    })
    .onConflictDoNothing()
    .returning({ id: users.id });

  if (created) {
    return created.id;
  }

  const [concurrentlyCreated] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!concurrentlyCreated) {
    throw new Error("Failed to provision the authenticated user.");
  }

  return concurrentlyCreated.id;
}
