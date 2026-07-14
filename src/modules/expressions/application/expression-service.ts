import { getCurrentActorId } from "@/modules/auth/application/current-actor";

import { type ExpressionInput, expressionInputSchema } from "../domain/expression";
import {
  archiveExpressionRecord,
  findExpressionForUser,
  findExpressionsForUser,
  insertExpression,
  updateExpressionRecord,
} from "../infrastructure/expression-repository";

export async function listExpressions() {
  return findExpressionsForUser(getCurrentActorId());
}

export async function getExpression(expressionId: string) {
  return findExpressionForUser(getCurrentActorId(), expressionId);
}

export async function createExpression(input: ExpressionInput) {
  return insertExpression(getCurrentActorId(), expressionInputSchema.parse(input));
}

export async function updateExpression(expressionId: string, input: ExpressionInput) {
  return updateExpressionRecord(
    getCurrentActorId(),
    expressionId,
    expressionInputSchema.parse(input),
  );
}

export async function archiveExpression(expressionId: string) {
  return archiveExpressionRecord(getCurrentActorId(), expressionId);
}
