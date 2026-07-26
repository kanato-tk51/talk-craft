import { and, desc, eq, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import { expressions } from "@/db/schema";

import { type ExpressionInput, normalizeExpression } from "../domain/expression";

export class DuplicateExpressionError extends Error {
  constructor() {
    super("An expression with the same normalized English text already exists");
    this.name = "DuplicateExpressionError";
  }
}

export async function findExpressionsForUser(actorUserId: string) {
  const db = getDb();
  return db
    .select()
    .from(expressions)
    .where(and(eq(expressions.userId, actorUserId), ne(expressions.learningStatus, "archived")))
    .orderBy(desc(expressions.updatedAt));
}

export async function findExpressionForUser(actorUserId: string, expressionId: string) {
  const db = getDb();
  const [expression] = await db
    .select()
    .from(expressions)
    .where(and(eq(expressions.id, expressionId), eq(expressions.userId, actorUserId)))
    .limit(1);

  return expression ?? null;
}

export async function insertExpression(actorUserId: string, input: ExpressionInput) {
  const db = getDb();
  const normalized = normalizeExpression(input.expressionEn);
  const [existing] = await db
    .select({ id: expressions.id, learningStatus: expressions.learningStatus })
    .from(expressions)
    .where(
      and(eq(expressions.userId, actorUserId), eq(expressions.normalizedExpressionEn, normalized)),
    )
    .limit(1);

  if (existing) {
    if (existing.learningStatus === "archived") {
      const [restored] = await db
        .update(expressions)
        .set({
          ...input,
          normalizedExpressionEn: normalized,
          updatedAt: new Date(),
        })
        .where(and(eq(expressions.id, existing.id), eq(expressions.userId, actorUserId)))
        .returning({ id: expressions.id });

      if (!restored) {
        throw new Error("Failed to restore expression");
      }

      return restored.id;
    }

    throw new DuplicateExpressionError();
  }

  const [created] = await db
    .insert(expressions)
    .values({
      userId: actorUserId,
      ...input,
      normalizedExpressionEn: normalized,
    })
    .returning({ id: expressions.id });

  if (!created) {
    throw new Error("Failed to create expression");
  }

  return created.id;
}

export async function updateExpressionRecord(
  actorUserId: string,
  expressionId: string,
  input: ExpressionInput,
) {
  const db = getDb();
  const normalized = normalizeExpression(input.expressionEn);
  const [duplicate] = await db
    .select({ id: expressions.id })
    .from(expressions)
    .where(
      and(
        eq(expressions.userId, actorUserId),
        eq(expressions.normalizedExpressionEn, normalized),
        ne(expressions.id, expressionId),
      ),
    )
    .limit(1);

  if (duplicate) {
    throw new DuplicateExpressionError();
  }

  const [updated] = await db
    .update(expressions)
    .set({
      ...input,
      normalizedExpressionEn: normalized,
      updatedAt: new Date(),
    })
    .where(and(eq(expressions.id, expressionId), eq(expressions.userId, actorUserId)))
    .returning({ id: expressions.id });

  return Boolean(updated);
}

export async function archiveExpressionRecord(actorUserId: string, expressionId: string) {
  const db = getDb();
  const [archived] = await db
    .update(expressions)
    .set({ learningStatus: "archived", updatedAt: new Date() })
    .where(and(eq(expressions.id, expressionId), eq(expressions.userId, actorUserId)))
    .returning({ id: expressions.id });

  return Boolean(archived);
}
