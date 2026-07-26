"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ExpressionActionState } from "@/modules/expressions/application/action-state";
import {
  archiveExpression,
  createExpression,
  updateExpression,
} from "@/modules/expressions/application/expression-service";
import { expressionIdSchema, expressionInputSchema } from "@/modules/expressions/domain/expression";
import { DuplicateExpressionError } from "@/modules/expressions/infrastructure/expression-repository";
import { linkExpression } from "@/modules/sessions/application/session-service";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function lines(formData: FormData, key: string) {
  return text(formData, key)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function returnSessionId(formData: FormData): string | null {
  const value = text(formData, "returnToSessionId");
  return z.uuid().safeParse(value).success ? value : null;
}

function parseExpressionForm(formData: FormData) {
  return expressionInputSchema.safeParse({
    expressionEn: text(formData, "expressionEn"),
    meaningJa: text(formData, "meaningJa"),
    alternativeExpressions: lines(formData, "alternativeExpressions"),
    examples: lines(formData, "examples"),
    relatedWords: lines(formData, "relatedWords"),
    usageNotes: text(formData, "usageNotes"),
    pronunciationNotes: text(formData, "pronunciationNotes"),
    learningStatus: text(formData, "learningStatus"),
    priority: text(formData, "priority"),
  });
}

function failure(error: unknown): ExpressionActionState {
  if (error instanceof DuplicateExpressionError) {
    return {
      message: "同じ英語表現がすでにライブラリにあります。",
      fieldErrors: { expressionEn: ["重複している表現を確認してください"] },
    };
  }

  console.error("Expression mutation failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return { message: "表現を保存できませんでした。", fieldErrors: {} };
}

export async function createExpressionAction(
  _previousState: ExpressionActionState,
  formData: FormData,
): Promise<ExpressionActionState> {
  const returnToSessionId = returnSessionId(formData);
  const result = parseExpressionForm(formData);
  if (!result.success) {
    return {
      message: "入力内容を確認してください。",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  let expressionId: string;
  try {
    expressionId = await createExpression(result.data);
  } catch (error) {
    return failure(error);
  }

  if (returnToSessionId && (await linkExpression(returnToSessionId, expressionId))) {
    redirect(`/sessions/${returnToSessionId}`);
  }

  redirect(`/expressions/${expressionId}/edit`);
}

export async function updateExpressionAction(
  expressionId: string,
  _previousState: ExpressionActionState,
  formData: FormData,
): Promise<ExpressionActionState> {
  const parsedExpressionId = expressionIdSchema.safeParse(expressionId);
  if (!parsedExpressionId.success) {
    return { message: "表現が見つかりません。", fieldErrors: {} };
  }

  const returnToSessionId = returnSessionId(formData);
  const result = parseExpressionForm(formData);
  if (!result.success) {
    return {
      message: "入力内容を確認してください。",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateExpression(parsedExpressionId.data, result.data);
    if (!updated) {
      return { message: "表現が見つかりません。", fieldErrors: {} };
    }
  } catch (error) {
    return failure(error);
  }

  redirect(returnToSessionId ? `/sessions/${returnToSessionId}` : "/expressions");
}

export async function archiveExpressionAction(expressionId: string, formData: FormData) {
  const returnToSessionId = returnSessionId(formData);
  const parsedExpressionId = expressionIdSchema.safeParse(expressionId);
  if (!parsedExpressionId.success) {
    redirect(returnToSessionId ? `/sessions/${returnToSessionId}` : "/expressions");
  }

  await archiveExpression(parsedExpressionId.data);
  revalidatePath("/expressions");
  redirect(returnToSessionId ? `/sessions/${returnToSessionId}` : "/expressions");
}
