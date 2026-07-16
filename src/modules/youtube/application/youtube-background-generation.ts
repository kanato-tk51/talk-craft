import { after } from "next/server";

import { getCurrentActorId } from "@/modules/auth/application/current-actor";
import { renderTranslationPrompt } from "../domain/youtube-material";
import {
  findYoutubeMaterialForUser,
  markYoutubeMaterialGenerationQueued,
  type QueueYoutubeGenerationResult,
  resetYoutubeMaterialTranslationForRegeneration,
} from "../infrastructure/youtube-material-repository";
import { generateYoutubeMaterialTranslation } from "./youtube-generation-service";

const globalForYoutubeGeneration = globalThis as typeof globalThis & {
  youtubeGenerationJobs?: Map<string, Promise<void>>;
};

const activeJobs =
  globalForYoutubeGeneration.youtubeGenerationJobs ?? new Map<string, Promise<void>>();
globalForYoutubeGeneration.youtubeGenerationJobs = activeJobs;

export async function queueYoutubeGeneration(
  materialId: string,
): Promise<QueueYoutubeGenerationResult> {
  const result = await markYoutubeMaterialGenerationQueued(getCurrentActorId(), materialId);
  if (result === "queued" || result === "already_running") {
    scheduleYoutubeGeneration(materialId);
  }
  return result;
}

export async function restartYoutubeGeneration(
  materialId: string,
): Promise<QueueYoutubeGenerationResult> {
  const actorUserId = getCurrentActorId();
  const material = await findYoutubeMaterialForUser(actorUserId, materialId);
  if (!material) return "missing";
  if (["queued", "structuring", "translating"].includes(material.generationStatus)) {
    scheduleYoutubeGeneration(materialId);
    return "already_running";
  }

  const reset = await resetYoutubeMaterialTranslationForRegeneration(
    actorUserId,
    materialId,
    material.version,
    {
      translationPrompt: renderTranslationPrompt({
        title: material.title,
        channelName: material.channelName,
        captionSource: material.captionSource,
        blocks: material.transcriptBlocks,
      }),
      keyExpressions: material.keyExpressions.filter((expression) => expression.origin === "user"),
    },
  );
  if (!reset) return "already_running";

  scheduleYoutubeGeneration(materialId);
  return "queued";
}

export function scheduleYoutubeGeneration(materialId: string): void {
  if (activeJobs.has(materialId)) return;
  after(() => runYoutubeGenerationInBackground(materialId));
}

async function runYoutubeGenerationInBackground(materialId: string): Promise<void> {
  const existingJob = activeJobs.get(materialId);
  if (existingJob) return existingJob;

  const job = executeYoutubeGeneration(materialId).finally(() => {
    if (activeJobs.get(materialId) === job) activeJobs.delete(materialId);
  });
  activeJobs.set(materialId, job);
  return job;
}

async function executeYoutubeGeneration(materialId: string): Promise<void> {
  try {
    await generateYoutubeMaterialTranslation(materialId);
  } catch (error) {
    console.error("YouTube background generation failed", {
      materialId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
