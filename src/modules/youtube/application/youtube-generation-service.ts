import { getCurrentActorId } from "@/modules/auth/application/current-actor";
import {
  buildParagraphPlan,
  buildSentenceAlignedTranscriptBlocks,
  buildTranslationChunks,
  type CompactStructureOutput,
  type CompactTranslationOutput,
  createYoutubeGenerationCheckpoint,
  mergeGeneratedYoutubeTranslation,
  mergePartialGeneratedYoutubeTranslation,
  type PlannedParagraph,
  restoreYoutubeGenerationCheckpoint,
  type TranslationChunk,
  validateChunkTranslation,
  YOUTUBE_GENERATION_MODEL,
  YoutubeGenerationValidationError,
} from "../domain/youtube-generation";
import type { KeyExpression, YoutubeCaptionSource } from "../domain/youtube-material";
import {
  requestYoutubeChunkTranslation,
  requestYoutubeStructure,
  YoutubeAiGenerationError,
} from "../infrastructure/openai-youtube-client";
import {
  findYoutubeMaterialForUser,
  markYoutubeMaterialGenerationFailed,
  updateYoutubeMaterialGenerationCheckpoint,
  updateYoutubeMaterialTranslation,
} from "../infrastructure/youtube-material-repository";
import { runTranslationChunksWithCheckpoints } from "./youtube-generation-runner";

const MAX_SEMANTIC_ATTEMPTS = 2;
const TRANSLATION_CONCURRENCY = 3;

export async function generateYoutubeMaterialTranslation(materialId: string): Promise<boolean> {
  const actorUserId = getCurrentActorId();
  const material = await findYoutubeMaterialForUser(actorUserId, materialId);
  if (!material) return false;
  if (material.generationStatus === "completed" && material.translatedAt) return true;

  const userExpressions = material.keyExpressions.filter(
    (expression) => expression.origin === "user",
  );
  const generationSourceBlocks = buildSentenceAlignedTranscriptBlocks(material.transcriptBlocks);
  const restored = restoreYoutubeGenerationCheckpoint(
    material.generationCheckpoint,
    generationSourceBlocks,
  );

  try {
    let structure: CompactStructureOutput;
    let paragraphs: PlannedParagraph[];
    let translationChunks: TranslationChunk[];
    let completedChunks: Map<number, CompactTranslationOutput>;

    if (restored) {
      structure = normalizeStructure(restored.checkpoint.structure, generationSourceBlocks);
      paragraphs = restored.paragraphs;
      translationChunks = restored.translationChunks;
      completedChunks = new Map(restored.completedChunks);
    } else {
      const started = await updateYoutubeMaterialGenerationCheckpoint(
        actorUserId,
        materialId,
        material.version,
        {
          status: "structuring",
          checkpoint: null,
          summaryJa: "",
          translationBlocks: [],
          keyExpressions: userExpressions,
        },
      );
      if (!started) return false;

      const structureResult = await generateValidStructure({
        title: material.title,
        channelName: material.channelName,
        captionSource: material.captionSource,
        sourceBlocks: generationSourceBlocks,
      });
      structure = normalizeStructure(structureResult.output, generationSourceBlocks);
      paragraphs = buildParagraphPlan(generationSourceBlocks, structure.e);
      translationChunks = buildTranslationChunks(paragraphs);
      completedChunks = new Map();
    }

    const persistProgress = async (chunks: ReadonlyMap<number, CompactTranslationOutput>) => {
      const checkpoint = createYoutubeGenerationCheckpoint(structure, translationChunks, chunks);
      const partial = mergePartialGeneratedYoutubeTranslation(
        structure,
        paragraphs,
        generatedChunkEntries(translationChunks, chunks),
      );
      return updateYoutubeMaterialGenerationCheckpoint(actorUserId, materialId, material.version, {
        status: "translating",
        checkpoint,
        summaryJa: partial.summaryJa,
        translationBlocks: partial.translationBlocks,
        keyExpressions: mergeUserExpressions(partial.keyExpressions, userExpressions),
      });
    };

    if (!(await persistProgress(completedChunks))) return false;

    completedChunks = await runTranslationChunksWithCheckpoints(
      translationChunks,
      completedChunks,
      async (chunk) =>
        (await generateValidChunk(chunk, structure.g, material.captionSource)).output,
      async (chunks) => {
        if (!(await persistProgress(chunks))) {
          throw new YoutubeAiGenerationError(
            "教材が更新されています。画面を再読み込みしてから再実行してください。",
          );
        }
      },
      TRANSLATION_CONCURRENCY,
    );

    const generated = mergeGeneratedYoutubeTranslation(
      structure,
      paragraphs,
      generatedChunkEntries(translationChunks, completedChunks),
    );
    const generationCheckpoint = createYoutubeGenerationCheckpoint(
      structure,
      translationChunks,
      completedChunks,
    );
    const rawAiResponse = JSON.stringify({
      m: YOUTUBE_GENERATION_MODEL,
      r: structure,
      c: translationChunks.map((_, index) => completedChunks.get(index)),
    });

    return updateYoutubeMaterialTranslation(actorUserId, materialId, material.version, {
      ...generated,
      keyExpressions: mergeUserExpressions(generated.keyExpressions, userExpressions),
      rawAiResponse,
      generationCheckpoint,
    });
  } catch (error) {
    try {
      await markYoutubeMaterialGenerationFailed(
        actorUserId,
        materialId,
        material.version,
        error instanceof Error ? error.message : "AIによる教材生成に失敗しました。",
      );
    } catch (checkpointError) {
      console.error("YouTube generation failure checkpoint could not be saved", {
        errorName: checkpointError instanceof Error ? checkpointError.name : "UnknownError",
      });
    }
    throw error;
  }
}

async function generateValidStructure(input: Parameters<typeof requestYoutubeStructure>[0]) {
  let lastValidationError: YoutubeGenerationValidationError | undefined;
  for (let attempt = 0; attempt < MAX_SEMANTIC_ATTEMPTS; attempt += 1) {
    const result = await requestYoutubeStructure(input);
    try {
      const normalized = normalizeStructure(result.output, input.sourceBlocks);
      buildParagraphPlan(input.sourceBlocks, normalized.e);
      return { ...result, output: normalized };
    } catch (error) {
      if (!(error instanceof YoutubeGenerationValidationError)) throw error;
      lastValidationError = error;
    }
  }
  throw new YoutubeAiGenerationError(
    lastValidationError?.message ?? "AIが有効な段落構造を返しませんでした。",
  );
}

async function generateValidChunk(
  chunk: TranslationChunk,
  glossary: CompactStructureOutput["g"],
  captionSource: YoutubeCaptionSource,
) {
  let lastValidationError: YoutubeGenerationValidationError | undefined;
  for (let attempt = 0; attempt < MAX_SEMANTIC_ATTEMPTS; attempt += 1) {
    const result = await requestYoutubeChunkTranslation({ chunk, glossary, captionSource });
    try {
      validateChunkTranslation(chunk, result.output);
      return result;
    } catch (error) {
      if (!(error instanceof YoutubeGenerationValidationError)) throw error;
      lastValidationError = error;
    }
  }
  throw new YoutubeAiGenerationError(
    lastValidationError?.message ?? "AIが有効な翻訳結果を返しませんでした。",
  );
}

function normalizeStructure(
  output: CompactStructureOutput,
  sourceBlocks: Array<{ text: string }>,
): CompactStructureOutput {
  const summary = output.s.trim().slice(0, 1_000);
  if (!summary) {
    throw new YoutubeGenerationValidationError("AIの動画要約が空です。");
  }
  const sourceText = sourceBlocks
    .map((block) => block.text)
    .join(" ")
    .toLocaleLowerCase("en-US");
  const seenTerms = new Set<string>();
  return {
    s: summary,
    e: output.e,
    g: output.g
      .map((item) => ({ e: item.e.trim(), j: item.j.trim() }))
      .filter((item) => {
        const key = item.e.toLocaleLowerCase("en-US");
        if (!item.e || !item.j || seenTerms.has(key) || !sourceText.includes(key)) return false;
        seenTerms.add(key);
        return true;
      })
      .slice(0, 20),
  };
}

function generatedChunkEntries(
  chunks: TranslationChunk[],
  results: ReadonlyMap<number, CompactTranslationOutput>,
) {
  return [...results.entries()]
    .sort(([left], [right]) => left - right)
    .flatMap(([index, output]) => {
      const chunk = chunks[index];
      return chunk ? [{ chunk, output }] : [];
    });
}

function mergeUserExpressions(
  aiExpressions: KeyExpression[],
  userExpressions: KeyExpression[],
): KeyExpression[] {
  const aiExpressionKeys = new Set(
    aiExpressions.map((expression) => normalizeExpression(expression.expressionEn)),
  );
  return [
    ...aiExpressions,
    ...userExpressions.filter(
      (expression) => !aiExpressionKeys.has(normalizeExpression(expression.expressionEn)),
    ),
  ];
}

function normalizeExpression(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export type YoutubeChunkGenerationResult = {
  output: CompactTranslationOutput;
  rawOutput: string;
};
