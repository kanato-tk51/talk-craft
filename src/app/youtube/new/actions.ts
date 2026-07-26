"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { YoutubeImportActionState } from "@/modules/youtube/application/action-state";
import { createYoutubeMaterial } from "@/modules/youtube/application/youtube-service";
import {
  extractYouTubeVideoId,
  MAX_TRANSCRIPT_CHARACTERS,
  PastedTranscriptError,
} from "@/modules/youtube/domain/youtube-material";

const youtubeImportSchema = z.object({
  youtubeUrl: z
    .string()
    .trim()
    .min(1, "YouTubeのURLを入力してください")
    .max(2_000)
    .refine(
      (value) => extractYouTubeVideoId(value) !== null,
      "有効なYouTube URLを入力してください",
    ),
  title: z.string().trim().max(300, "動画タイトルは300文字以内で入力してください"),
  channelName: z.string().trim().max(200, "チャンネル名は200文字以内で入力してください"),
  transcript: z
    .string()
    .trim()
    .min(1, "YouTubeからコピーした英語字幕を貼り付けてください")
    .max(MAX_TRANSCRIPT_CHARACTERS, "字幕が長すぎます。現在は約20万文字まで対応しています。"),
});

export async function importYoutubeAction(
  _previousState: YoutubeImportActionState,
  formData: FormData,
): Promise<YoutubeImportActionState> {
  const values = {
    youtubeUrl: String(formData.get("youtubeUrl") ?? ""),
    title: String(formData.get("title") ?? ""),
    channelName: String(formData.get("channelName") ?? ""),
    transcript: String(formData.get("transcript") ?? ""),
  };
  const parsedInput = youtubeImportSchema.safeParse(values);
  if (!parsedInput.success) {
    return {
      message: "入力内容を確認してください。",
      values,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    };
  }

  let creationResult: Awaited<ReturnType<typeof createYoutubeMaterial>>;
  try {
    creationResult = await createYoutubeMaterial(parsedInput.data);
  } catch (error) {
    if (error instanceof PastedTranscriptError) {
      return {
        message: error.message,
        values,
        fieldErrors: { transcript: [error.message] },
      };
    }
    console.error("YouTube material import failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      message: "教材を作成できませんでした。入力内容を確認して再度お試しください。",
      values,
      fieldErrors: {},
    };
  }

  redirect(`/youtube/${creationResult.materialId}`);
}
