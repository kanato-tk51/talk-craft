"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { YoutubeImportActionState } from "@/modules/youtube/application/action-state";
import { queueYoutubeGeneration } from "@/modules/youtube/application/youtube-background-generation";
import {
  chooseManualYoutubeTranslation,
  createYoutubeMaterial,
} from "@/modules/youtube/application/youtube-service";
import { YoutubeTranscriptError } from "@/modules/youtube/infrastructure/youtube-caption-client";

const youtubeImportSchema = z.object({
  youtubeUrl: z.string().trim().min(1, "YouTubeのURLを入力してください").max(2_000),
  generationMethod: z.enum(["api", "browser"]).default("browser"),
});

export async function importYoutubeAction(
  _previousState: YoutubeImportActionState,
  formData: FormData,
): Promise<YoutubeImportActionState> {
  const parsedInput = youtubeImportSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
    generationMethod: formData.get("generationMethod") || undefined,
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

  let failureQuery = "";
  if (creationResult.automaticTranslation === "pending") {
    if (parsedInput.data.generationMethod === "browser") {
      try {
        const selected = await chooseManualYoutubeTranslation(creationResult.materialId);
        failureQuery = selected ? "?method=browser" : "";
      } catch (error) {
        console.error("Browser translation mode could not be selected", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        failureQuery = "?generation=failed&method=browser";
      }
    } else {
      try {
        const queueResult = await queueYoutubeGeneration(creationResult.materialId);
        if (queueResult === "missing") failureQuery = "?generation=failed";
      } catch (error) {
        console.error("YouTube background translation could not be queued", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        failureQuery = "?generation=failed";
      }
    }
  }
  redirect(`/youtube/${creationResult.materialId}${failureQuery}`);
}
