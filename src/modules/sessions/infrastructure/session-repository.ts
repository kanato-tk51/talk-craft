import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { getDb } from "@/db/client";
import { expressions, generatedPrompts, sessionExpressions, sessions } from "@/db/schema";
import type { RenderedPromptSet } from "@/modules/prompts/domain/prompt";
import { REVIEW_SCHEMA_VERSION } from "@/modules/prompts/domain/prompt";

import { type CreateSessionInput, normalizeExpression } from "../domain/create-session";

export async function insertSessionWithPreparation(
  actorUserId: string,
  input: CreateSessionInput,
  prompts: RenderedPromptSet,
): Promise<string> {
  const db = getDb();
  const normalizedExpressions = input.linkedExpressions.map((expression) =>
    normalizeExpression(expression.expressionEn),
  );
  const existingExpressions = normalizedExpressions.length
    ? await db
        .select({
          id: expressions.id,
          normalizedExpressionEn: expressions.normalizedExpressionEn,
          learningStatus: expressions.learningStatus,
        })
        .from(expressions)
        .where(
          and(
            eq(expressions.userId, actorUserId),
            inArray(expressions.normalizedExpressionEn, normalizedExpressions),
          ),
        )
    : [];
  const existingExpressionByNormalizedValue = new Map(
    existingExpressions.map((expression) => [expression.normalizedExpressionEn, expression]),
  );
  const sessionId = crypto.randomUUID();
  const statements: BatchItem<"sqlite">[] = [
    db.insert(sessions).values({
      id: sessionId,
      userId: actorUserId,
      title: input.title,
      topic: input.topic,
      objective: input.objective,
    }),
  ];

  for (const [sequence, expression] of input.linkedExpressions.entries()) {
    const normalizedExpressionEn = normalizedExpressions[sequence];
    if (!normalizedExpressionEn) {
      throw new Error("Failed to normalize linked expression");
    }

    const existingExpression = existingExpressionByNormalizedValue.get(normalizedExpressionEn);
    const expressionId = existingExpression?.id ?? crypto.randomUUID();

    if (existingExpression?.learningStatus === "archived") {
      statements.push(
        db
          .update(expressions)
          .set({
            expressionEn: expression.expressionEn,
            normalizedExpressionEn,
            meaningJa: expression.meaningJa,
            learningStatus: "new",
            updatedAt: new Date(),
          })
          .where(eq(expressions.id, existingExpression.id)),
      );
    } else if (!existingExpression) {
      statements.push(
        db.insert(expressions).values({
          id: expressionId,
          userId: actorUserId,
          expressionEn: expression.expressionEn,
          normalizedExpressionEn,
          meaningJa: expression.meaningJa,
        }),
      );
    }

    statements.push(
      db.insert(sessionExpressions).values({
        sessionId,
        expressionId,
        expressionEnSnapshot: expression.expressionEn,
        meaningJaSnapshot: expression.meaningJa,
        sequence,
      }),
    );
  }

  statements.push(
    db.insert(generatedPrompts).values([
      {
        sessionId,
        promptType: "conversation_start",
        templateKey: prompts.templateKey,
        templateVersion: prompts.templateVersion,
        inputSnapshot: prompts.inputSnapshot,
        renderedContent: prompts.start,
      },
      {
        sessionId,
        promptType: "review_output",
        templateKey: prompts.templateKey,
        templateVersion: prompts.templateVersion,
        schemaVersion: REVIEW_SCHEMA_VERSION,
        inputSnapshot: prompts.inputSnapshot,
        renderedContent: prompts.review,
      },
    ]),
  );

  await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  return sessionId;
}

export async function findSessionsForUser(actorUserId: string) {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  const [[ownedSession], [ownedExpression]] = await Promise.all([
    db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, actorUserId)))
      .limit(1),
    db
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

  const [lastExpression] = await db
    .select({ sequence: sessionExpressions.sequence })
    .from(sessionExpressions)
    .where(eq(sessionExpressions.sessionId, sessionId))
    .orderBy(desc(sessionExpressions.sequence))
    .limit(1);

  const [linkedExpression] = await db
    .insert(sessionExpressions)
    .values({
      sessionId,
      expressionId,
      expressionEnSnapshot: ownedExpression.expressionEn,
      meaningJaSnapshot: ownedExpression.meaningJa,
      sequence: (lastExpression?.sequence ?? -1) + 1,
    })
    .onConflictDoNothing()
    .returning({ id: sessionExpressions.id });

  return Boolean(linkedExpression);
}

export async function unlinkExpressionRecord(
  actorUserId: string,
  sessionId: string,
  sessionExpressionId: string,
) {
  const db = getDb();
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
