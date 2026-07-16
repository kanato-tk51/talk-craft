"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { TranslationImportActionState } from "@/modules/youtube/application/action-state";
import { queueYoutubeGeneration } from "@/modules/youtube/application/youtube-background-generation";
import {
  addYoutubeKeyExpression,
  deleteYoutubeMaterial,
  saveYoutubeTranslation,
  UserKeyExpressionError,
} from "@/modules/youtube/application/youtube-service";
import {
  TranslationResponseError,
  type UserKeyExpressionInput,
  userKeyExpressionInputSchema,
} from "@/modules/youtube/domain/youtube-material";

const identifiersSchema = z.object({ materialId: z.uuid() });

export async function saveTranslationAction(
  materialId: string,
  _previousState: TranslationImportActionState,
  formData: FormData,
): Promise<TranslationImportActionState> {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    return { message: "教材が見つかりません。" };
  }
  const rawResponse = formData.get("rawAiResponse");

  try {
    const updated = await saveYoutubeTranslation(
      materialId,
      typeof rawResponse === "string" ? rawResponse : "",
    );
    if (!updated) {
      return { message: "教材が更新されています。画面を再読み込みしてからお試しください。" };
    }
  } catch (error) {
    if (error instanceof TranslationResponseError) {
      return { message: error.message };
    }
    console.error("YouTube translation import failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { message: "翻訳結果を保存できませんでした。" };
  }

  revalidatePath(`/youtube/${materialId}`);
  return { message: "saved" };
}

export async function retryAutomaticTranslationAction(
  materialId: string,
  _previousState: TranslationImportActionState,
  _formData: FormData,
): Promise<TranslationImportActionState> {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    return { message: "教材が見つかりません。" };
  }

  try {
    const result = await queueYoutubeGeneration(materialId);
    if (result === "missing") return { message: "教材が見つかりません。" };
    if (result === "completed") return { message: "saved" };
  } catch (error) {
    console.error("YouTube background translation could not be queued", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      message: "バックグラウンド処理を開始できませんでした。少し待ってから再実行してください。",
    };
  }

  revalidatePath(`/youtube/${materialId}`);
  revalidatePath("/youtube");
  return { message: "queued" };
}

export type AddKeyExpressionActionResult = { success: true } | { success: false; message: string };

export async function addKeyExpressionAction(
  materialId: string,
  input: UserKeyExpressionInput,
): Promise<AddKeyExpressionActionResult> {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    return { success: false, message: "教材が見つかりません。" };
  }
  const parsed = userKeyExpressionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
    };
  }

  try {
    const updated = await addYoutubeKeyExpression(materialId, parsed.data);
    if (!updated) {
      return {
        success: false,
        message: "教材が更新されています。再読み込みしてから選択し直してください。",
      };
    }
  } catch (error) {
    if (error instanceof UserKeyExpressionError) {
      return { success: false, message: error.message };
    }
    console.error("YouTube key expression creation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "重要表現を保存できませんでした。" };
  }

  revalidatePath(`/youtube/${materialId}`);
  return { success: true };
}

export async function deleteYoutubeMaterialAction(materialId: string, _formData: FormData) {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    redirect("/youtube");
  }

  await deleteYoutubeMaterial(materialId);
  revalidatePath("/youtube");
  redirect("/youtube");
}
