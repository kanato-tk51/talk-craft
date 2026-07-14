import { and, asc, desc, eq, ne } from "drizzle-orm";

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
        title: input.title,
        topic: input.topic,
        objective: input.objective,
      })
      .returning({ id: sessions.id });

    if (!createdSession) {
      throw new Error("Failed to create session");
    }

    for (const [sequence, expression] of input.linkedExpressions.entries()) {
      const normalizedExpressionEn = normalizeExpression(expression.expressionEn);
      const [existingExpression] = await transaction
        .select({ id: expressions.id, learningStatus: expressions.learningStatus })
        .from(expressions)
        .where(
          and(
            eq(expressions.userId, actorUserId),
            eq(expressions.normalizedExpressionEn, normalizedExpressionEn),
          ),
        )
        .limit(1);

      let libraryExpression = existingExpression;
      if (existingExpression?.learningStatus === "archived") {
        [libraryExpression] = await transaction
          .update(expressions)
          .set({
            expressionEn: expression.expressionEn,
            normalizedExpressionEn,
            meaningJa: expression.meaningJa,
            learningStatus: "new",
            updatedAt: new Date(),
          })
          .where(eq(expressions.id, existingExpression.id))
          .returning({ id: expressions.id, learningStatus: expressions.learningStatus });
      } else if (!existingExpression) {
        [libraryExpression] = await transaction
          .insert(expressions)
          .values({
            userId: actorUserId,
            expressionEn: expression.expressionEn,
            normalizedExpressionEn,
            meaningJa: expression.meaningJa,
          })
          .returning({ id: expressions.id, learningStatus: expressions.learningStatus });
      }

      if (!libraryExpression) {
        throw new Error("Failed to create linked expression");
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
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, actorUserId))
    .orderBy(desc(sessions.createdAt));
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

  const [linkedExpressions, prompts, libraryExpressions] = await Promise.all([
    db
      .select({
        id: sessionExpressions.id,
        expressionId: sessionExpressions.expressionId,
        expressionEn: expressions.expressionEn,
        meaningJa: expressions.meaningJa,
        learningStatus: expressions.learningStatus,
        plannedToUse: sessionExpressions.plannedToUse,
      })
      .from(sessionExpressions)
      .innerJoin(expressions, eq(sessionExpressions.expressionId, expressions.id))
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
    db
      .select({
        id: expressions.id,
        expressionEn: expressions.expressionEn,
        meaningJa: expressions.meaningJa,
      })
      .from(expressions)
      .where(and(eq(expressions.userId, actorUserId), ne(expressions.learningStatus, "archived")))
      .orderBy(asc(expressions.expressionEn)),
  ]);

  const linkedIds = new Set(linkedExpressions.map((expression) => expression.expressionId));
  const availableExpressions = libraryExpressions.filter(
    (expression) => !linkedIds.has(expression.id),
  );

  return { session, linkedExpressions, availableExpressions, prompts };
}

export async function linkExpressionRecord(
  actorUserId: string,
  sessionId: string,
  expressionId: string,
) {
  return db.transaction(async (transaction) => {
    const [[ownedSession], [ownedExpression]] = await Promise.all([
      transaction
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, actorUserId)))
        .limit(1),
      transaction
        .select({
          id: expressions.id,
          expressionEn: expressions.expressionEn,
          meaningJa: expressions.meaningJa,
        })
        .from(expressions)
        .where(
          and(
            eq(expressions.id, expressionId),
            eq(expressions.userId, actorUserId),
            ne(expressions.learningStatus, "archived"),
          ),
        )
        .limit(1),
    ]);

    if (!ownedSession || !ownedExpression) {
      return false;
    }

    const [lastExpression] = await transaction
      .select({ sequence: sessionExpressions.sequence })
      .from(sessionExpressions)
      .where(eq(sessionExpressions.sessionId, sessionId))
      .orderBy(desc(sessionExpressions.sequence))
      .limit(1);

    await transaction
      .insert(sessionExpressions)
      .values({
        sessionId,
        expressionId,
        expressionEnSnapshot: ownedExpression.expressionEn,
        meaningJaSnapshot: ownedExpression.meaningJa,
        sequence: (lastExpression?.sequence ?? -1) + 1,
      })
      .onConflictDoNothing();

    return true;
  });
}

export async function unlinkExpressionRecord(
  actorUserId: string,
  sessionId: string,
  sessionExpressionId: string,
) {
  const [ownedSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, actorUserId)))
    .limit(1);

  if (!ownedSession) {
    return false;
  }

  const [removed] = await db
    .delete(sessionExpressions)
    .where(
      and(
        eq(sessionExpressions.id, sessionExpressionId),
        eq(sessionExpressions.sessionId, sessionId),
      ),
    )
    .returning({ id: sessionExpressions.id });

  return Boolean(removed);
}
