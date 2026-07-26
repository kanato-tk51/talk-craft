import { getCurrentActorId } from "@/modules/auth/application/current-actor";

import {
  type ExpressionInput,
  expressionIdSchema,
  expressionInputSchema,
} from "../domain/expression";
import {
  archiveExpressionRecord,
  findExpressionForUser,
  findExpressionsForUser,
  insertExpression,
  updateExpressionRecord,
} from "../infrastructure/expression-repository";

export async function listExpressions() {
  return findExpressionsForUser(await getCurrentActorId());
}

export async function getExpression(expressionId: string) {
  const parsedExpressionId = expressionIdSchema.safeParse(expressionId);
  if (!parsedExpressionId.success) return null;
  return findExpressionForUser(await getCurrentActorId(), parsedExpressionId.data);
}

export async function createExpression(input: ExpressionInput) {
  return insertExpression(await getCurrentActorId(), expressionInputSchema.parse(input));
}

export async function updateExpression(expressionId: string, input: ExpressionInput) {
  return updateExpressionRecord(
    await getCurrentActorId(),
    expressionIdSchema.parse(expressionId),
    expressionInputSchema.parse(input),
  );
}

export async function archiveExpression(expressionId: string) {
  return archiveExpressionRecord(await getCurrentActorId(), expressionIdSchema.parse(expressionId));
}
