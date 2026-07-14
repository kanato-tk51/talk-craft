import { getCurrentActorId } from "@/modules/auth/application/current-actor";
import { renderSessionPrompts } from "@/modules/prompts/application/render-session-prompts";

import { type CreateSessionInput, createSessionInputSchema } from "../domain/create-session";
import {
  findSessionDetail,
  findSessionsForUser,
  insertSessionWithPreparation,
  linkExpressionRecord,
  unlinkExpressionRecord,
} from "../infrastructure/session-repository";

export async function createSession(input: CreateSessionInput): Promise<string> {
  const actorUserId = getCurrentActorId();
  const validatedInput = createSessionInputSchema.parse(input);
  const prompts = renderSessionPrompts(validatedInput);

  return insertSessionWithPreparation(actorUserId, validatedInput, prompts);
}

export async function listSessions() {
  return findSessionsForUser(getCurrentActorId());
}

export async function getSessionDetail(sessionId: string) {
  return findSessionDetail(getCurrentActorId(), sessionId);
}

export async function linkExpression(sessionId: string, expressionId: string) {
  return linkExpressionRecord(getCurrentActorId(), sessionId, expressionId);
}

export async function unlinkExpression(sessionId: string, sessionExpressionId: string) {
  return unlinkExpressionRecord(getCurrentActorId(), sessionId, sessionExpressionId);
}
