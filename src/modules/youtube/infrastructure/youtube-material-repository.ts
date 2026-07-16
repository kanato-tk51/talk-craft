import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { youtubeMaterials } from "@/db/schema";

import type {
  YoutubeGenerationCheckpoint,
  YoutubeGenerationStatus,
} from "../domain/youtube-generation";
import type {
  FetchedYoutubeTranscript,
  KeyExpression,
  TranscriptBlock,
  TranslationBlock,
} from "../domain/youtube-material";
import { TRANSLATION_PROMPT_VERSION } from "../domain/youtube-material";

export async function findYoutubeMaterialsForUser(actorUserId: string) {
  return db
    .select({
      id: youtubeMaterials.id,
      youtubeVideoId: youtubeMaterials.youtubeVideoId,
      title: youtubeMaterials.title,
      channelName: youtubeMaterials.channelName,
      thumbnailUrl: youtubeMaterials.thumbnailUrl,
      captionTrackName: youtubeMaterials.captionTrackName,
      captionSource: youtubeMaterials.captionSource,
      generationStatus: youtubeMaterials.generationStatus,
      translatedAt: youtubeMaterials.translatedAt,
      createdAt: youtubeMaterials.createdAt,
    })
    .from(youtubeMaterials)
    .where(eq(youtubeMaterials.userId, actorUserId))
    .orderBy(desc(youtubeMaterials.updatedAt));
}

export async function findYoutubeMaterialForUser(actorUserId: string, materialId: string) {
  const [material] = await db
    .select()
    .from(youtubeMaterials)
    .where(and(eq(youtubeMaterials.id, materialId), eq(youtubeMaterials.userId, actorUserId)))
    .limit(1);

  return material ?? null;
}

export async function findYoutubeMaterialByVideoId(actorUserId: string, youtubeVideoId: string) {
  const [material] = await db
    .select({ id: youtubeMaterials.id, translatedAt: youtubeMaterials.translatedAt })
    .from(youtubeMaterials)
    .where(
      and(
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.youtubeVideoId, youtubeVideoId),
      ),
    )
    .limit(1);

  return material ?? null;
}

export async function insertYoutubeMaterial(
  actorUserId: string,
  source: FetchedYoutubeTranscript,
  transcriptBlocks: TranscriptBlock[],
  transcriptText: string,
  translationPrompt: string,
) {
  const [created] = await db
    .insert(youtubeMaterials)
    .values({
      userId: actorUserId,
      youtubeVideoId: source.youtubeVideoId,
      sourceUrl: source.sourceUrl,
      title: source.title,
      channelName: source.channelName,
      thumbnailUrl: source.thumbnailUrl,
      captionLanguageCode: source.captionLanguageCode,
      captionTrackName: source.captionTrackName,
      captionSource: source.captionSource,
      transcriptText,
      transcriptBlocks,
      translationPrompt,
      promptVersion: TRANSLATION_PROMPT_VERSION,
    })
    .onConflictDoNothing({
      target: [youtubeMaterials.userId, youtubeMaterials.youtubeVideoId],
    })
    .returning({ id: youtubeMaterials.id });

  if (created) {
    return created.id;
  }

  const existing = await findYoutubeMaterialByVideoId(actorUserId, source.youtubeVideoId);
  if (!existing) {
    throw new Error("Failed to create YouTube material");
  }
  return existing.id;
}

export async function updateYoutubeMaterialTranslation(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  input: {
    summaryJa: string;
    translationBlocks: TranslationBlock[];
    keyExpressions: KeyExpression[];
    rawAiResponse: string;
    generationCheckpoint?: YoutubeGenerationCheckpoint | null;
  },
) {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      summaryJa: input.summaryJa,
      translationBlocks: input.translationBlocks,
      keyExpressions: input.keyExpressions,
      rawAiResponse: input.rawAiResponse,
      generationStatus: "completed",
      generationCheckpoint: input.generationCheckpoint ?? null,
      generationError: "",
      translatedAt: new Date(),
      updatedAt: new Date(),
      version: expectedVersion + 1,
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.version, expectedVersion),
      ),
    )
    .returning({ id: youtubeMaterials.id });

  return Boolean(updated);
}

export type QueueYoutubeGenerationResult = "queued" | "already_running" | "completed" | "missing";

export async function markYoutubeMaterialGenerationQueued(
  actorUserId: string,
  materialId: string,
): Promise<QueueYoutubeGenerationResult> {
  const [queued] = await db
    .update(youtubeMaterials)
    .set({
      generationStatus: "queued",
      generationError: "",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        isNull(youtubeMaterials.translatedAt),
        inArray(youtubeMaterials.generationStatus, ["pending", "manual", "failed"]),
      ),
    )
    .returning({ id: youtubeMaterials.id });
  if (queued) return "queued";

  const [current] = await db
    .select({
      generationStatus: youtubeMaterials.generationStatus,
      translatedAt: youtubeMaterials.translatedAt,
    })
    .from(youtubeMaterials)
    .where(and(eq(youtubeMaterials.id, materialId), eq(youtubeMaterials.userId, actorUserId)))
    .limit(1);
  if (!current) return "missing";
  if (current.translatedAt || current.generationStatus === "completed") return "completed";
  return "already_running";
}

export async function markYoutubeMaterialGenerationManual(
  actorUserId: string,
  materialId: string,
): Promise<boolean> {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      generationStatus: "manual",
      generationError: "",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        isNull(youtubeMaterials.translatedAt),
        inArray(youtubeMaterials.generationStatus, ["pending", "manual", "failed"]),
      ),
    )
    .returning({ id: youtubeMaterials.id });
  return Boolean(updated);
}

export async function resetYoutubeMaterialTranslationForRegeneration(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  input: {
    translationPrompt: string;
    keyExpressions: KeyExpression[];
  },
): Promise<boolean> {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      translationPrompt: input.translationPrompt,
      promptVersion: TRANSLATION_PROMPT_VERSION,
      summaryJa: "",
      translationBlocks: [],
      keyExpressions: input.keyExpressions,
      rawAiResponse: "",
      generationStatus: "queued",
      generationCheckpoint: null,
      generationError: "",
      translatedAt: null,
      updatedAt: new Date(),
      version: expectedVersion + 1,
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.version, expectedVersion),
      ),
    )
    .returning({ id: youtubeMaterials.id });

  return Boolean(updated);
}

export async function updateYoutubeMaterialGenerationCheckpoint(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  input: {
    status: Extract<YoutubeGenerationStatus, "structuring" | "translating">;
    checkpoint: YoutubeGenerationCheckpoint | null;
    summaryJa: string;
    translationBlocks: TranslationBlock[];
    keyExpressions: KeyExpression[];
  },
) {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      generationStatus: input.status,
      generationCheckpoint: input.checkpoint,
      generationError: "",
      summaryJa: input.summaryJa,
      translationBlocks: input.translationBlocks,
      keyExpressions: input.keyExpressions,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.version, expectedVersion),
      ),
    )
    .returning({ id: youtubeMaterials.id });

  return Boolean(updated);
}

export async function markYoutubeMaterialGenerationFailed(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  errorMessage: string,
) {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      generationStatus: "failed",
      generationError: errorMessage.slice(0, 4_000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.version, expectedVersion),
      ),
    )
    .returning({ id: youtubeMaterials.id });

  return Boolean(updated);
}

export async function updateYoutubeMaterialKeyExpressions(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  keyExpressions: KeyExpression[],
) {
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      keyExpressions,
      updatedAt: new Date(),
      version: expectedVersion + 1,
    })
    .where(
      and(
        eq(youtubeMaterials.id, materialId),
        eq(youtubeMaterials.userId, actorUserId),
        eq(youtubeMaterials.version, expectedVersion),
      ),
    )
    .returning({ id: youtubeMaterials.id });

  return Boolean(updated);
}

export async function deleteYoutubeMaterialRecord(actorUserId: string, materialId: string) {
  const [deleted] = await db
    .delete(youtubeMaterials)
    .where(and(eq(youtubeMaterials.id, materialId), eq(youtubeMaterials.userId, actorUserId)))
    .returning({ id: youtubeMaterials.id });

  return Boolean(deleted);
}
