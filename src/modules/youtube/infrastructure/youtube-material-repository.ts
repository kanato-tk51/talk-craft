import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { youtubeMaterials } from "@/db/schema";

import type {
  KeyExpression,
  TranscriptBlock,
  TranslationBlock,
  YoutubeTranscriptSource,
} from "../domain/youtube-material";
import { TRANSLATION_PROMPT_VERSION } from "../domain/youtube-material";

export async function findYoutubeMaterialsForUser(actorUserId: string) {
  const db = getDb();
  return db
    .select({
      id: youtubeMaterials.id,
      youtubeVideoId: youtubeMaterials.youtubeVideoId,
      title: youtubeMaterials.title,
      channelName: youtubeMaterials.channelName,
      thumbnailUrl: youtubeMaterials.thumbnailUrl,
      captionTrackName: youtubeMaterials.captionTrackName,
      captionSource: youtubeMaterials.captionSource,
      translatedAt: youtubeMaterials.translatedAt,
      createdAt: youtubeMaterials.createdAt,
    })
    .from(youtubeMaterials)
    .where(eq(youtubeMaterials.userId, actorUserId))
    .orderBy(desc(youtubeMaterials.updatedAt));
}

export async function findYoutubeMaterialForUser(actorUserId: string, materialId: string) {
  const db = getDb();
  const [material] = await db
    .select()
    .from(youtubeMaterials)
    .where(and(eq(youtubeMaterials.id, materialId), eq(youtubeMaterials.userId, actorUserId)))
    .limit(1);

  return material ?? null;
}

export async function findYoutubeMaterialByVideoId(actorUserId: string, youtubeVideoId: string) {
  const db = getDb();
  const [material] = await db
    .select({ id: youtubeMaterials.id })
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
  source: YoutubeTranscriptSource,
  transcriptBlocks: TranscriptBlock[],
  transcriptText: string,
  translationPrompt: string,
) {
  const db = getDb();
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
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      summaryJa: input.summaryJa,
      translationBlocks: input.translationBlocks,
      keyExpressions: input.keyExpressions,
      rawAiResponse: input.rawAiResponse,
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

export async function updateYoutubeMaterialTranscript(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  input: {
    transcriptBlocks: TranscriptBlock[];
    transcriptText: string;
    translationPrompt: string;
  },
) {
  const db = getDb();
  const [updated] = await db
    .update(youtubeMaterials)
    .set({
      transcriptBlocks: input.transcriptBlocks,
      transcriptText: input.transcriptText,
      translationPrompt: input.translationPrompt,
      promptVersion: TRANSLATION_PROMPT_VERSION,
      summaryJa: "",
      translationBlocks: [],
      keyExpressions: [],
      rawAiResponse: "",
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

export async function updateYoutubeMaterialKeyExpressions(
  actorUserId: string,
  materialId: string,
  expectedVersion: number,
  keyExpressions: KeyExpression[],
) {
  const db = getDb();
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
  const db = getDb();
  const [deleted] = await db
    .delete(youtubeMaterials)
    .where(and(eq(youtubeMaterials.id, materialId), eq(youtubeMaterials.userId, actorUserId)))
    .returning({ id: youtubeMaterials.id });

  return Boolean(deleted);
}
