import "dotenv/config";

import { and, eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { sessions } from "../src/db/schema";
import {
  createSession,
  getSessionDetail,
} from "../src/modules/sessions/application/session-service";

async function main() {
  const actorUserId = process.env.DEV_USER_ID;
  if (!actorUserId) {
    throw new Error("DEV_USER_ID is required for smoke cleanup");
  }

  let createdSessionId: string | undefined;

  try {
    createdSessionId = await createSession({
      title: "Smoke test session",
      topic: "A short introduction",
      objective: "Verify the preparation flow",
      situation: "A first meeting",
      userRole: "Learner",
      aiRole: "Conversation partner",
      conversationType: "text",
      difficulty: "intermediate",
      plannedDurationMinutes: 5,
      scheduledAt: null,
      preparationNotes: "Keep the conversation moving",
      providerName: "Generic external AI",
      providerWebsiteUrl: null,
      modelName: "",
      preparedExpressions: [
        {
          expressionEn: "It is nice to meet you.",
          meaningJa: "はじめまして",
        },
      ],
    });

    const detail = await getSessionDetail(createdSessionId);
    if (detail?.preparedExpressions.length !== 1 || detail.prompts.length !== 2) {
      throw new Error("Smoke test did not read the complete preparation aggregate");
    }

    console.log("Database smoke test passed");
  } finally {
    if (createdSessionId) {
      await db
        .delete(sessions)
        .where(and(eq(sessions.id, createdSessionId), eq(sessions.userId, actorUserId)));
    }
    await sqlClient.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database smoke test failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  process.exitCode = 1;
});
