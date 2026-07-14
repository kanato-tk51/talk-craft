"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { linkExpression, unlinkExpression } from "@/modules/sessions/application/session-service";

const linkIdentifiersSchema = z.object({
  sessionId: z.uuid(),
  expressionId: z.uuid(),
});

const unlinkIdentifiersSchema = z.object({
  sessionId: z.uuid(),
  sessionExpressionId: z.uuid(),
});

export async function linkExpressionAction(sessionId: string, formData: FormData) {
  const result = linkIdentifiersSchema.safeParse({
    sessionId,
    expressionId: formData.get("expressionId"),
  });

  if (!result.success) {
    return;
  }

  await linkExpression(result.data.sessionId, result.data.expressionId);
  revalidatePath(`/sessions/${sessionId}`);
}

export async function unlinkExpressionAction(sessionId: string, sessionExpressionId: string) {
  const result = unlinkIdentifiersSchema.safeParse({
    sessionId,
    sessionExpressionId,
  });

  if (!result.success) {
    return;
  }

  await unlinkExpression(result.data.sessionId, result.data.sessionExpressionId);
  revalidatePath(`/sessions/${sessionId}`);
}
