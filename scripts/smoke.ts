import "dotenv/config";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db, sqlClient } from "../src/db/client";
import { expressions, sessions } from "../src/db/schema";
import {
  createExpression,
  updateExpression,
} from "../src/modules/expressions/application/expression-service";
import {
  createSession,
  getSessionDetail,
  linkExpression,
  unlinkExpression,
} from "../src/modules/sessions/application/session-service";

async function main() {
  const actorUserId = process.env.DEV_USER_ID;
  if (!actorUserId) {
    throw new Error("DEV_USER_ID is required for smoke cleanup");
  }

  let createdSessionId: string | undefined;
  let createdExpressionId: string | undefined;

  try {
    createdSessionId = await createSession({
      title: "Smoke test session",
      topic: "A short introduction",
      objective: "",
      linkedExpressions: [],
    });

    createdExpressionId = await createExpression({
      expressionEn: `Smoke expression ${randomUUID()}`,
      meaningJa: "スモークテスト用",
      alternativeExpressions: [],
      examples: ["This expression is used in a smoke test."],
      relatedWords: [],
      usageNotes: "",
      pronunciationNotes: "",
      learningStatus: "new",
      priority: "medium",
    });
    await updateExpression(createdExpressionId, {
      expressionEn: `Updated smoke expression ${randomUUID()}`,
      meaningJa: "更新済みスモークテスト用",
      alternativeExpressions: [],
      examples: ["This expression was updated."],
      relatedWords: [],
      usageNotes: "",
      pronunciationNotes: "",
      learningStatus: "practicing",
      priority: "high",
    });
    await linkExpression(createdSessionId, createdExpressionId);

    const detail = await getSessionDetail(createdSessionId);
    if (detail?.linkedExpressions.length !== 1 || detail.prompts.length !== 2) {
      throw new Error("Smoke test did not read the complete preparation aggregate");
    }
    const linkedManualExpression = detail.linkedExpressions.find(
      (expression) => expression.expressionId === createdExpressionId,
    );
    if (!linkedManualExpression) {
      throw new Error("Smoke test did not link the manual expression");
    }
    await unlinkExpression(createdSessionId, linkedManualExpression.id);

    console.log("Database smoke test passed");
  } finally {
    if (createdSessionId) {
      await db
        .delete(sessions)
        .where(and(eq(sessions.id, createdSessionId), eq(sessions.userId, actorUserId)));
    }
    if (createdExpressionId) {
      await db
        .delete(expressions)
        .where(and(eq(expressions.id, createdExpressionId), eq(expressions.userId, actorUserId)));
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
