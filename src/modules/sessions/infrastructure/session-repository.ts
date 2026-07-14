import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { expressions, generatedPrompts, sessionExpressions, sessions } from "@/db/schema";
import type { RenderedPromptSet } from "@/modules/prompts/domain/prompt";
import { REVIEW_SCHEMA_VERSION } from "@/modules/prompts/domain/prompt";

import { type CreateSessionInput, normalizeExpression } from "../domain/create-session";

export async function insertSessionWithPreparation(
  actorUserId: string,
  input: CreateSessionInput,
  prompts: RenderedPromptSet,
): Promise<string> {
  return db.transaction(async (transaction) => {
    const [createdSession] = await transaction
      .insert(sessions)
      .values({
        userId: actorUserId,
        providerNameSnapshot: input.providerName,
        providerWebsiteUrlSnapshot: input.providerWebsiteUrl,
        modelName: input.modelName,
        title: input.title,
        topic: input.topic,
        objective: input.objective,
        situation: input.situation,
        userRole: input.userRole,
        aiRole: input.aiRole,
        conversationType: input.conversationType,
        difficulty: input.difficulty,
        plannedDurationMinutes: input.plannedDurationMinutes,
        scheduledAt: input.scheduledAt,
        preparationNotes: input.preparationNotes,
      })
      .returning({ id: sessions.id });

    if (!createdSession) {
      throw new Error("Failed to create session");
    }

    for (const [sequence, expression] of input.preparedExpressions.entries()) {
      const [libraryExpression] = await transaction
        .insert(expressions)
        .values({
          userId: actorUserId,
          expressionEn: expression.expressionEn,
          normalizedExpressionEn: normalizeExpression(expression.expressionEn),
          meaningJa: expression.meaningJa,
        })
        .onConflictDoUpdate({
          target: [expressions.userId, expressions.normalizedExpressionEn],
          set: { updatedAt: new Date() },
        })
        .returning({ id: expressions.id });

      if (!libraryExpression) {
        throw new Error("Failed to create prepared expression");
      }

      await transaction.insert(sessionExpressions).values({
        sessionId: createdSession.id,
        expressionId: libraryExpression.id,
        expressionEnSnapshot: expression.expressionEn,
        meaningJaSnapshot: expression.meaningJa,
        sequence,
      });
    }

    await transaction.insert(generatedPrompts).values([
      {
        sessionId: createdSession.id,
        promptType: "conversation_start",
        templateKey: prompts.templateKey,
        templateVersion: prompts.templateVersion,
        inputSnapshot: prompts.inputSnapshot,
        renderedContent: prompts.start,
      },
      {
        sessionId: createdSession.id,
        promptType: "review_output",
        templateKey: prompts.templateKey,
        templateVersion: prompts.templateVersion,
        schemaVersion: REVIEW_SCHEMA_VERSION,
        inputSnapshot: prompts.inputSnapshot,
        renderedContent: prompts.review,
      },
    ]);

    return createdSession.id;
  });
}

export async function findSessionsForUser(actorUserId: string) {
  return db
    .select({
      id: sessions.id,
      title: sessions.title,
      topic: sessions.topic,
      status: sessions.status,
      conversationType: sessions.conversationType,
      providerName: sessions.providerNameSnapshot,
      scheduledAt: sessions.scheduledAt,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, actorUserId))
    .orderBy(desc(sessions.scheduledAt), desc(sessions.createdAt));
}

export async function findSessionDetail(actorUserId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, actorUserId)))
    .limit(1);

  if (!session) {
    return null;
  }

  const [preparedExpressions, prompts] = await Promise.all([
    db
      .select({
        id: sessionExpressions.id,
        expressionEn: sessionExpressions.expressionEnSnapshot,
        meaningJa: sessionExpressions.meaningJaSnapshot,
        plannedToUse: sessionExpressions.plannedToUse,
      })
      .from(sessionExpressions)
      .where(eq(sessionExpressions.sessionId, sessionId))
      .orderBy(asc(sessionExpressions.sequence)),
    db
      .select({
        id: generatedPrompts.id,
        type: generatedPrompts.promptType,
        content: generatedPrompts.renderedContent,
        templateVersion: generatedPrompts.templateVersion,
        schemaVersion: generatedPrompts.schemaVersion,
      })
      .from(generatedPrompts)
      .where(eq(generatedPrompts.sessionId, sessionId))
      .orderBy(asc(generatedPrompts.createdAt)),
  ]);

  return { session, preparedExpressions, prompts };
}
