"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type {
  TranscriptEditActionState,
  TranslationImportActionState,
} from "@/modules/youtube/application/action-state";
import {
  addYoutubeKeyExpression,
  deleteYoutubeKeyExpression,
  deleteYoutubeMaterial,
  editYoutubeTranscriptSelection,
  saveYoutubeTranslation,
  UserKeyExpressionError,
  updateYoutubeTranscript,
} from "@/modules/youtube/application/youtube-service";
import {
  TranscriptEditError,
  type TranscriptSelectionEditInput,
  TranslationResponseError,
  transcriptSelectionEditInputSchema,
  type UserKeyExpressionInput,
  userKeyExpressionInputSchema,
} from "@/modules/youtube/domain/youtube-material";

const identifiersSchema = z.object({ materialId: z.uuid() });
const deleteKeyExpressionSchema = identifiersSchema.extend({
  expressionEn: z.string().trim().min(1).max(1_000),
});

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

export async function saveTranscriptAction(
  materialId: string,
  _previousState: TranscriptEditActionState,
  formData: FormData,
): Promise<TranscriptEditActionState> {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    return { message: "教材が見つかりません。" };
  }

  const blockTexts = new Map<number, string>();
  for (const [name, value] of formData.entries()) {
    const match = /^transcriptBlock-(\d+)$/.exec(name);
    if (!match || typeof value !== "string") continue;
    const sequence = Number(match[1]);
    if (!Number.isSafeInteger(sequence) || sequence < 1 || blockTexts.has(sequence)) {
      return { message: "字幕の入力内容を確認してください。" };
    }
    blockTexts.set(sequence, value);
  }

  try {
    const updated = await updateYoutubeTranscript(materialId, blockTexts);
    if (!updated) {
      return { message: "教材が更新されています。画面を再読み込みしてからお試しください。" };
    }
  } catch (error) {
    if (error instanceof TranscriptEditError) {
      return { message: error.message };
    }
    console.error("YouTube transcript update failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { message: "英語字幕を保存できませんでした。" };
  }

  revalidatePath(`/youtube/${materialId}`);
  redirect(`/youtube/${materialId}`);
}

export type KeyExpressionActionResult = { success: true } | { success: false; message: string };

export async function editTranscriptSelectionAction(
  materialId: string,
  input: TranscriptSelectionEditInput,
): Promise<KeyExpressionActionResult> {
  if (!identifiersSchema.safeParse({ materialId }).success) {
    return { success: false, message: "教材が見つかりません。" };
  }
  const parsed = transcriptSelectionEditInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "編集内容を確認してください。",
    };
  }

  try {
    const updated = await editYoutubeTranscriptSelection(materialId, parsed.data);
    if (!updated) {
      return {
        success: false,
        message: "教材が更新されています。画面を再読み込みしてから選択し直してください。",
      };
    }
  } catch (error) {
    if (error instanceof TranscriptEditError) {
      return { success: false, message: error.message };
    }
    console.error("YouTube transcript selection update failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "選択した英語字幕を保存できませんでした。" };
  }

  revalidatePath(`/youtube/${materialId}`);
  return { success: true };
}

export async function addKeyExpressionAction(
  materialId: string,
  input: UserKeyExpressionInput,
): Promise<KeyExpressionActionResult> {
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

export async function deleteKeyExpressionAction(
  materialId: string,
  expressionEn: string,
): Promise<KeyExpressionActionResult> {
  const parsed = deleteKeyExpressionSchema.safeParse({ materialId, expressionEn });
  if (!parsed.success) {
    return { success: false, message: "削除する重要表現が見つかりません。" };
  }

  try {
    const updated = await deleteYoutubeKeyExpression(
      parsed.data.materialId,
      parsed.data.expressionEn,
    );
    if (!updated) {
      return {
        success: false,
        message: "教材が更新されています。画面を再読み込みしてからお試しください。",
      };
    }
  } catch (error) {
    if (error instanceof UserKeyExpressionError) {
      return { success: false, message: error.message };
    }
    console.error("YouTube key expression deletion failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, message: "重要表現を削除できませんでした。" };
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
