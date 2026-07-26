"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { YoutubeImportActionState } from "@/modules/youtube/application/action-state";
import { createYoutubeMaterial } from "@/modules/youtube/application/youtube-service";
import { YoutubeTranscriptError } from "@/modules/youtube/infrastructure/youtube-caption-client";

const youtubeImportSchema = z.object({
  youtubeUrl: z.string().trim().min(1, "YouTubeのURLを入力してください").max(2_000),
});

export async function importYoutubeAction(
  _previousState: YoutubeImportActionState,
  formData: FormData,
): Promise<YoutubeImportActionState> {
  const parsedInput = youtubeImportSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
  });
  if (!parsedInput.success) {
    return {
      message: "入力内容を確認してください。",
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    };
  }

  let creationResult: Awaited<ReturnType<typeof createYoutubeMaterial>>;
  try {
    creationResult = await createYoutubeMaterial(parsedInput.data.youtubeUrl);
  } catch (error) {
    if (error instanceof YoutubeTranscriptError) {
      return { message: error.message, fieldErrors: { youtubeUrl: [error.message] } };
    }
    console.error("YouTube material import failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      message: "字幕を取得できませんでした。少し待ってから再度お試しください。",
      fieldErrors: {},
    };
  }

  redirect(`/youtube/${creationResult.materialId}`);
}
