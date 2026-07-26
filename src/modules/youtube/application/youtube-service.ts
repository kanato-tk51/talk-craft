import { getCurrentActorId } from "@/modules/auth/application/current-actor";
import { findExpressionRanges } from "../domain/expression-annotations";
import {
  buildTranscriptBlocks,
  buildTranscriptText,
  extractYouTubeVideoId,
  parseTranslationResponse,
  removeKeyExpression,
  renderTranslationPrompt,
  type UserKeyExpressionInput,
  userKeyExpressionInputSchema,
} from "../domain/youtube-material";
import { fetchEnglishYoutubeTranscript } from "../infrastructure/youtube-caption-client";
import {
  deleteYoutubeMaterialRecord,
  findYoutubeMaterialByVideoId,
  findYoutubeMaterialForUser,
  findYoutubeMaterialsForUser,
  insertYoutubeMaterial,
  updateYoutubeMaterialKeyExpressions,
  updateYoutubeMaterialTranslation,
} from "../infrastructure/youtube-material-repository";

export async function listYoutubeMaterials() {
  return findYoutubeMaterialsForUser(getCurrentActorId());
}

export async function getYoutubeMaterial(materialId: string) {
  const material = await findYoutubeMaterialForUser(getCurrentActorId(), materialId);
  if (!material) return null;
  return {
    ...material,
    translationPrompt: renderTranslationPrompt({
      title: material.title,
      channelName: material.channelName,
      captionSource: material.captionSource,
      blocks: material.transcriptBlocks,
    }),
  };
}

export async function deleteYoutubeMaterial(materialId: string) {
  return deleteYoutubeMaterialRecord(getCurrentActorId(), materialId);
}

export async function createYoutubeMaterial(inputUrl: string) {
  const actorUserId = getCurrentActorId();
  const youtubeVideoId = extractYouTubeVideoId(inputUrl);
  if (youtubeVideoId) {
    const existing = await findYoutubeMaterialByVideoId(actorUserId, youtubeVideoId);
    if (existing) {
      return { materialId: existing.id };
    }
  }

  const source = await fetchEnglishYoutubeTranscript(inputUrl);
  const transcriptBlocks = buildTranscriptBlocks(source.cues);
  if (!transcriptBlocks.length) {
    throw new Error("YouTube transcript did not contain readable text");
  }
  const transcriptText = buildTranscriptText(transcriptBlocks);
  const translationPrompt = renderTranslationPrompt({
    title: source.title,
    channelName: source.channelName,
    captionSource: source.captionSource,
    blocks: transcriptBlocks,
  });

  const materialId = await insertYoutubeMaterial(
    actorUserId,
    source,
    transcriptBlocks,
    transcriptText,
    translationPrompt,
  );
  return { materialId };
}

export async function saveYoutubeTranslation(materialId: string, rawAiResponse: string) {
  const actorUserId = getCurrentActorId();
  const material = await findYoutubeMaterialForUser(actorUserId, materialId);
  if (!material) {
    return false;
  }

  const parsed = parseTranslationResponse(
    rawAiResponse,
    material.transcriptBlocks,
    material.captionSource,
  );
  const userExpressions = material.keyExpressions.filter(
    (expression) => expression.origin === "user",
  );
  const aiExpressionKeys = new Set(
    parsed.keyExpressions.map((expression) => normalizeExpression(expression.expressionEn)),
  );
  return updateYoutubeMaterialTranslation(actorUserId, materialId, material.version, {
    ...parsed,
    keyExpressions: [
      ...parsed.keyExpressions,
      ...userExpressions.filter(
        (expression) => !aiExpressionKeys.has(normalizeExpression(expression.expressionEn)),
      ),
    ],
    rawAiResponse,
  });
}

export async function addYoutubeKeyExpression(materialId: string, input: UserKeyExpressionInput) {
  const actorUserId = getCurrentActorId();
  const validatedInput = userKeyExpressionInputSchema.parse(input);
  const material = await findYoutubeMaterialForUser(actorUserId, materialId);
  if (!material) {
    throw new UserKeyExpressionError("教材が見つかりません。");
  }

  const displaySource = material.translationBlocks.every((block) => block.sourceEn)
    ? material.translationBlocks.map((block) => block.sourceEn).join(" ")
    : material.transcriptBlocks.map((block) => block.text).join(" ");
  if (!findExpressionRanges(displaySource, [{ ...validatedInput, origin: "user" }]).length) {
    throw new UserKeyExpressionError(
      "選択した表現が英語原文と一致しません。原文内の文字を選択し直してください。",
    );
  }

  const normalizedExpression = normalizeExpression(validatedInput.expressionEn);
  if (
    material.keyExpressions.some(
      (expression) => normalizeExpression(expression.expressionEn) === normalizedExpression,
    )
  ) {
    throw new UserKeyExpressionError("この表現はすでに登録されています。");
  }
  if (material.keyExpressions.length >= 100) {
    throw new UserKeyExpressionError("重要表現は1教材につき100件まで登録できます。");
  }

  return updateYoutubeMaterialKeyExpressions(actorUserId, materialId, material.version, [
    ...material.keyExpressions,
    { ...validatedInput, origin: "user" },
  ]);
}

export async function deleteYoutubeKeyExpression(materialId: string, expressionEn: string) {
  const actorUserId = getCurrentActorId();
  const material = await findYoutubeMaterialForUser(actorUserId, materialId);
  if (!material) {
    throw new UserKeyExpressionError("教材が見つかりません。");
  }

  const remainingExpressions = removeKeyExpression(material.keyExpressions, expressionEn);
  if (!remainingExpressions) {
    throw new UserKeyExpressionError("重要表現が見つかりません。");
  }

  return updateYoutubeMaterialKeyExpressions(
    actorUserId,
    materialId,
    material.version,
    remainingExpressions,
  );
}

export class UserKeyExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserKeyExpressionError";
  }
}

function normalizeExpression(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}
