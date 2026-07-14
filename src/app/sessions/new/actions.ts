"use server";

import { redirect } from "next/navigation";
import type { CreateSessionActionState } from "@/modules/sessions/application/action-state";
import { createSession } from "@/modules/sessions/application/session-service";
import {
  createSessionInputSchema,
  localDateTimeToUtc,
} from "@/modules/sessions/domain/create-session";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parsePreparedExpressions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) {
        return { expressionEn: line, meaningJa: "" };
      }

      return {
        expressionEn: line.slice(0, separatorIndex).trim(),
        meaningJa: line.slice(separatorIndex + 1).trim(),
      };
    });
}

export async function createSessionAction(
  _previousState: CreateSessionActionState,
  formData: FormData,
): Promise<CreateSessionActionState> {
  const durationValue = text(formData, "plannedDurationMinutes");
  const offsetValue = Number(text(formData, "timezoneOffsetMinutes"));
  const timezoneOffsetMinutes =
    Number.isFinite(offsetValue) && Math.abs(offsetValue) <= 14 * 60 ? offsetValue : 0;

  const result = createSessionInputSchema.safeParse({
    title: text(formData, "title"),
    topic: text(formData, "topic"),
    objective: text(formData, "objective"),
    situation: text(formData, "situation"),
    userRole: text(formData, "userRole"),
    aiRole: text(formData, "aiRole"),
    conversationType: text(formData, "conversationType"),
    difficulty: text(formData, "difficulty"),
    plannedDurationMinutes: durationValue === "" ? null : Number(durationValue),
    scheduledAt: localDateTimeToUtc(text(formData, "scheduledAtLocal"), timezoneOffsetMinutes),
    preparationNotes: text(formData, "preparationNotes"),
    providerName: text(formData, "providerName"),
    providerWebsiteUrl: text(formData, "providerWebsiteUrl"),
    modelName: text(formData, "modelName"),
    preparedExpressions: parsePreparedExpressions(text(formData, "preparedExpressions")),
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
