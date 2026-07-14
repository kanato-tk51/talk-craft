"use server";

import { redirect } from "next/navigation";
import type { CreateSessionActionState } from "@/modules/sessions/application/action-state";
import { createSession } from "@/modules/sessions/application/session-service";
import { createSessionInputSchema } from "@/modules/sessions/domain/create-session";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function texts(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value : ""));
}

function parseLinkedExpressions(formData: FormData) {
  const englishExpressions = texts(formData, "linkedExpressionEn");
  const japaneseMeanings = texts(formData, "linkedExpressionMeaningJa");

  return englishExpressions.map((expressionEn, index) => ({
    expressionEn,
    meaningJa: japaneseMeanings[index] ?? "",
  }));
}

export async function createSessionAction(
  _previousState: CreateSessionActionState,
  formData: FormData,
): Promise<CreateSessionActionState> {
  const result = createSessionInputSchema.safeParse({
    title: text(formData, "title"),
    topic: text(formData, "topic"),
    objective: text(formData, "objective"),
    linkedExpressions: parseLinkedExpressions(formData),
  });

  if (!result.success) {
    return {
      message: "入力内容を確認してください。",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  let sessionId: string;
  try {
    sessionId = await createSession(result.data);
  } catch (error) {
    console.error("Session creation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      message: "セッションを保存できませんでした。少し待ってから再度お試しください。",
      fieldErrors: {},
    };
  }

  redirect(`/sessions/${sessionId}`);
}
