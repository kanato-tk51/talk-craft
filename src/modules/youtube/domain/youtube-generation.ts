import { z } from "zod";

import { findExpressionRanges } from "./expression-annotations";
import type { KeyExpression, TranscriptBlock, TranslationBlock } from "./youtube-material";

export const YOUTUBE_GENERATION_MODEL = "gpt-5.6-luna";
export const YOUTUBE_STRUCTURE_REASONING = "auto";
export const YOUTUBE_TRANSLATION_REASONING = "auto";
export const YOUTUBE_GENERATION_CHECKPOINT_VERSION = 5;

const MAX_CONTEXT_CHARACTERS = 1_200;
const MAX_AI_EXPRESSIONS = 12;

export const compactStructureOutputSchema = z.object({
  /** A short Japanese summary. */
  s: z.string(),
  /** The final source block sequence of each semantic paragraph. */
  e: z.array(z.number().int()),
  /** Only terms that need a stable Japanese translation across chunks. */
  g: z.array(
    z.object({
      e: z.string(),
      j: z.string(),
    }),
  ),
});

export type CompactStructureOutput = z.infer<typeof compactStructureOutputSchema>;
export type CompactGlossaryEntry = CompactStructureOutput["g"][number];

export const compactTranslationOutputSchema = z.object({
  /** Japanese translations keyed by deterministic paragraph and sentence sequences. */
  t: z.array(
    z.object({
      p: z.number().int(),
      s: z.number().int(),
      j: z.string(),
    }),
  ),
  /** Learning annotations. Keys are intentionally short to reduce output tokens. */
  x: z.array(
    z.object({
      p: z.number().int(),
      q: z.string(),
      m: z.string(),
      n: z.string(),
      e: z.string(),
      j: z.string(),
    }),
  ),
});

export type CompactTranslationOutput = z.infer<typeof compactTranslationOutputSchema>;

export const youtubeGenerationCheckpointSchema = z.object({
  version: z.literal(YOUTUBE_GENERATION_CHECKPOINT_VERSION),
  model: z.string(),
  structure: compactStructureOutputSchema,
  completedChunks: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      paragraphSequences: z.array(z.number().int().positive()),
      output: compactTranslationOutputSchema,
    }),
  ),
});

export type YoutubeGenerationCheckpoint = z.infer<typeof youtubeGenerationCheckpointSchema>;
export type YoutubeGenerationStatus =
  | "pending"
  | "manual"
  | "queued"
  | "structuring"
  | "translating"
  | "failed"
  | "completed";

export type PlannedParagraph = {
  sequence: number;
  startBlockSequence: number;
  endBlockSequence: number;
  startMs: number;
  sourceEn: string;
  sourceSentences: string[];
  estimatedTokens: number;
};

export type TranslationChunk = {
  paragraphs: PlannedParagraph[];
  previousContext: string;
  nextContext: string;
  expressionBudget: number;
};

export type GeneratedYoutubeTranslation = {
  summaryJa: string;
  translationBlocks: TranslationBlock[];
  keyExpressions: KeyExpression[];
};

export type RestoredYoutubeGenerationCheckpoint = {
  checkpoint: YoutubeGenerationCheckpoint;
  paragraphs: PlannedParagraph[];
  translationChunks: TranslationChunk[];
  completedChunks: Map<number, CompactTranslationOutput>;
};

export function buildSentenceAlignedTranscriptBlocks(
  sourceBlocks: TranscriptBlock[],
): TranscriptBlock[] {
  const normalizedBlocks = sourceBlocks
    .map((block) => ({
      startMs: block.startMs,
      text: normalizeSourceText(block.text),
    }))
    .filter((block) => block.text.length > 0);
  if (!normalizedBlocks.length) return [];

  const ranges: Array<{
    startOffset: number;
    endOffset: number;
    startMs: number;
  }> = [];
  let transcript = "";
  for (const block of normalizedBlocks) {
    if (transcript) transcript += " ";
    const startOffset = transcript.length;
    transcript += block.text;
    ranges.push({ startOffset, endOffset: transcript.length, startMs: block.startMs });
  }

  const sentenceSegments = new Intl.Segmenter("en", { granularity: "sentence" }).segment(
    transcript,
  );
  const alignedBlocks: TranscriptBlock[] = [];
  let rangeIndex = 0;
  for (const segment of sentenceSegments) {
    const leadingWhitespace = segment.segment.length - segment.segment.trimStart().length;
    const text = normalizeSourceText(segment.segment);
    if (!text) continue;

    const sourceOffset = segment.index + leadingWhitespace;
    while (
      rangeIndex < ranges.length - 1 &&
      sourceOffset >= (ranges[rangeIndex]?.endOffset ?? Number.POSITIVE_INFINITY)
    ) {
      rangeIndex += 1;
    }

    alignedBlocks.push({
      sequence: alignedBlocks.length + 1,
      startMs: estimateSentenceStartMs(sourceOffset, rangeIndex, ranges),
      text,
    });
  }

  return alignedBlocks;
}

export function buildParagraphPlan(
  sourceBlocks: TranscriptBlock[],
  paragraphEndSequences: number[],
): PlannedParagraph[] {
  if (!sourceBlocks.length) {
    throw new YoutubeGenerationValidationError("英語字幕が空です。");
  }

  const sourceSequences = sourceBlocks.map((block) => block.sequence);
  if (sourceSequences.some((sequence, index) => sequence !== index + 1)) {
    throw new YoutubeGenerationValidationError("字幕ブロックの番号が連続していません。");
  }

  const lastSequence = sourceBlocks.at(-1)?.sequence ?? 0;
  if (
    !paragraphEndSequences.length ||
    paragraphEndSequences.at(-1) !== lastSequence ||
    paragraphEndSequences.some(
      (sequence, index) =>
        !Number.isInteger(sequence) ||
        sequence < 1 ||
        sequence > lastSequence ||
        (index > 0 && sequence <= (paragraphEndSequences[index - 1] ?? 0)),
    )
  ) {
    throw new YoutubeGenerationValidationError(
      "AIが返した段落境界が英語字幕の範囲と一致しません。",
    );
  }

  const incompleteBoundary = paragraphEndSequences
    .slice(0, -1)
    .find((sequence) => !hasCompleteSentenceEnding(sourceBlocks[sequence - 1]?.text ?? ""));
  if (incompleteBoundary !== undefined) {
    throw new YoutubeGenerationValidationError(
      `AIが返した英文ブロック${incompleteBoundary}の後が文末ではありません。`,
    );
  }

  let firstBlockIndex = 0;
  return paragraphEndSequences.map((endSequence, paragraphIndex) => {
    const endBlockIndex = endSequence - 1;
    const paragraphBlocks = sourceBlocks.slice(firstBlockIndex, endBlockIndex + 1);
    const sourceEn = joinSourceBlocks(paragraphBlocks);
    const paragraph: PlannedParagraph = {
      sequence: paragraphIndex + 1,
      startBlockSequence: paragraphBlocks[0]?.sequence ?? endSequence,
      endBlockSequence: endSequence,
      startMs: paragraphBlocks[0]?.startMs ?? 0,
      sourceEn,
      sourceSentences: paragraphBlocks.map((block) => block.text),
      estimatedTokens: estimateEnglishTokens(sourceEn),
    };
    firstBlockIndex = endBlockIndex + 1;
    return paragraph;
  });
}

export function buildTranslationChunks(paragraphs: PlannedParagraph[]): TranslationChunk[] {
  if (!paragraphs.length) return [];

  const budgets = allocateExpressionBudgets(
    paragraphs.map((paragraph) => paragraph.estimatedTokens),
    MAX_AI_EXPRESSIONS,
  );

  return paragraphs.map((paragraph, index) => {
    const previousParagraph = paragraphs[index - 1];
    const nextParagraph = paragraphs[index + 1];
    return {
      paragraphs: [paragraph],
      previousContext: previousParagraph
        ? previousParagraph.sourceEn.slice(-MAX_CONTEXT_CHARACTERS)
        : "",
      nextContext: nextParagraph ? nextParagraph.sourceEn.slice(0, MAX_CONTEXT_CHARACTERS) : "",
      expressionBudget: budgets[index] ?? 0,
    };
  });
}

export function validateChunkTranslation(
  chunk: TranslationChunk,
  output: CompactTranslationOutput,
): void {
  const expectedPairs = chunk.paragraphs.flatMap((paragraph) =>
    paragraph.sourceSentences.map((_, sentenceIndex) => ({
      paragraphSequence: paragraph.sequence,
      sentenceSequence: sentenceIndex + 1,
    })),
  );
  if (
    expectedPairs.length !== output.t.length ||
    output.t.some((translation, index) => {
      const expected = expectedPairs[index];
      return (
        !expected ||
        translation.p !== expected.paragraphSequence ||
        translation.s !== expected.sentenceSequence ||
        !translation.j.trim()
      );
    })
  ) {
    throw new YoutubeGenerationValidationError(
      "AIの翻訳結果に段落・対応訳の欠落、重複、または空の訳があります。",
    );
  }
  if (output.x.length > chunk.expressionBudget) {
    throw new YoutubeGenerationValidationError("AIの重要表現数が指定した上限を超えています。");
  }
  const expectedSequenceSet = new Set(chunk.paragraphs.map((paragraph) => paragraph.sequence));
  if (output.x.some((expression) => !expectedSequenceSet.has(expression.p))) {
    throw new YoutubeGenerationValidationError("AIの重要表現が対象外の段落を参照しています。");
  }
}

export function mergeGeneratedYoutubeTranslation(
  structure: CompactStructureOutput,
  paragraphs: PlannedParagraph[],
  chunks: Array<{ chunk: TranslationChunk; output: CompactTranslationOutput }>,
): GeneratedYoutubeTranslation {
  return mergeYoutubeTranslation(structure, paragraphs, chunks, true);
}

export function mergePartialGeneratedYoutubeTranslation(
  structure: CompactStructureOutput,
  paragraphs: PlannedParagraph[],
  chunks: Array<{ chunk: TranslationChunk; output: CompactTranslationOutput }>,
): GeneratedYoutubeTranslation {
  return mergeYoutubeTranslation(structure, paragraphs, chunks, false);
}

function mergeYoutubeTranslation(
  structure: CompactStructureOutput,
  paragraphs: PlannedParagraph[],
  chunks: Array<{ chunk: TranslationChunk; output: CompactTranslationOutput }>,
  requireEveryParagraph: boolean,
): GeneratedYoutubeTranslation {
  const translationByParagraph = new Map<number, string[]>();
  const expressionCandidates: Array<{
    paragraph: PlannedParagraph;
    item: CompactTranslationOutput["x"][number];
  }> = [];

  for (const { chunk, output } of chunks) {
    validateChunkTranslation(chunk, output);
    for (const translation of output.t) {
      const sentenceTranslations = translationByParagraph.get(translation.p) ?? [];
      if (sentenceTranslations[translation.s - 1] !== undefined) {
        throw new YoutubeGenerationValidationError("AIの翻訳結果に重複した対応訳があります。");
      }
      sentenceTranslations[translation.s - 1] = translation.j.trim();
      translationByParagraph.set(translation.p, sentenceTranslations);
    }
    for (const item of output.x) {
      const paragraph = paragraphs[item.p - 1];
      if (paragraph) expressionCandidates.push({ paragraph, item });
    }
  }

  if (requireEveryParagraph && translationByParagraph.size !== paragraphs.length) {
    throw new YoutubeGenerationValidationError("AIの翻訳結果に未翻訳の段落があります。");
  }

  const seenExpressions = new Set<string>();
  const keyExpressions: KeyExpression[] = [];
  for (const { paragraph, item } of expressionCandidates) {
    const expressionEn = canonicalSourceExpression(paragraph.sourceEn, item.q);
    if (
      !expressionEn ||
      !item.m.trim() ||
      !item.n.trim() ||
      !item.e.trim() ||
      !item.j.trim() ||
      item.m.length > 1_000 ||
      item.n.length > 3_000 ||
      item.e.length > 2_000 ||
      item.j.length > 2_000
    ) {
      continue;
    }
    const normalized = expressionEn.toLocaleLowerCase("en-US").replaceAll(/\s+/g, " ").trim();
    if (!normalized || seenExpressions.has(normalized)) continue;
    seenExpressions.add(normalized);
    keyExpressions.push({
      expressionEn,
      meaningJa: item.m.trim(),
      explanationJa: item.n.trim(),
      exampleEn: item.e.trim(),
      exampleJa: item.j.trim(),
      origin: "ai",
    });
    if (keyExpressions.length >= MAX_AI_EXPRESSIONS) break;
  }

  return {
    summaryJa: structure.s.trim(),
    translationBlocks: paragraphs
      .filter((paragraph) => translationByParagraph.has(paragraph.sequence))
      .map((paragraph) => {
        const sentenceTranslations = translationByParagraph.get(paragraph.sequence) ?? [];
        return {
          sequence: paragraph.sequence,
          sourceEn: paragraph.sourceEn,
          translationJa: sentenceTranslations.join("\n"),
          startMs: paragraph.startMs,
          sentencePairs: paragraph.sourceSentences.map((sourceEn, index) => ({
            sourceEn,
            translationJa: sentenceTranslations[index] ?? "",
          })),
        };
      }),
    keyExpressions,
  };
}

export function createYoutubeGenerationCheckpoint(
  structure: CompactStructureOutput,
  translationChunks: TranslationChunk[],
  completedChunks: ReadonlyMap<number, CompactTranslationOutput>,
): YoutubeGenerationCheckpoint {
  return {
    version: YOUTUBE_GENERATION_CHECKPOINT_VERSION,
    model: YOUTUBE_GENERATION_MODEL,
    structure,
    completedChunks: [...completedChunks.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, output]) => ({
        index,
        paragraphSequences:
          translationChunks[index]?.paragraphs.map((paragraph) => paragraph.sequence) ?? [],
        output,
      })),
  };
}

export function restoreYoutubeGenerationCheckpoint(
  value: unknown,
  sourceBlocks: TranscriptBlock[],
): RestoredYoutubeGenerationCheckpoint | null {
  const parsed = youtubeGenerationCheckpointSchema.safeParse(value);
  if (!parsed.success || parsed.data.model !== YOUTUBE_GENERATION_MODEL) return null;

  try {
    const paragraphs = buildParagraphPlan(sourceBlocks, parsed.data.structure.e);
    const translationChunks = buildTranslationChunks(paragraphs);
    const completedChunks = new Map<number, CompactTranslationOutput>();

    for (const savedChunk of parsed.data.completedChunks) {
      const chunk = translationChunks[savedChunk.index];
      if (!chunk || completedChunks.has(savedChunk.index)) return null;
      const expectedSequences = chunk.paragraphs.map((paragraph) => paragraph.sequence);
      if (
        expectedSequences.length !== savedChunk.paragraphSequences.length ||
        expectedSequences.some(
          (sequence, index) => sequence !== savedChunk.paragraphSequences[index],
        )
      ) {
        return null;
      }
      validateChunkTranslation(chunk, savedChunk.output);
      completedChunks.set(savedChunk.index, savedChunk.output);
    }

    return {
      checkpoint: parsed.data,
      paragraphs,
      translationChunks,
      completedChunks,
    };
  } catch (error) {
    if (error instanceof YoutubeGenerationValidationError) return null;
    throw error;
  }
}

export function estimateEnglishTokens(value: string): number {
  // English prose averages roughly four characters per token. A deterministic
  // estimate is sufficient here because it controls chunk size, not billing.
  return Math.max(1, Math.ceil(value.length / 4));
}

function joinSourceBlocks(blocks: TranscriptBlock[]): string {
  return blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeSourceText(value: string): string {
  return value.replaceAll("\u200b", "").replaceAll("\u00a0", " ").replaceAll(/\s+/g, " ").trim();
}

function estimateSentenceStartMs(
  sourceOffset: number,
  rangeIndex: number,
  ranges: Array<{ startOffset: number; endOffset: number; startMs: number }>,
): number {
  const range = ranges[rangeIndex];
  if (!range) return 0;

  const nextStartMs = ranges[rangeIndex + 1]?.startMs;
  if (nextStartMs === undefined || nextStartMs <= range.startMs) return range.startMs;

  const blockLength = Math.max(1, range.endOffset - range.startOffset);
  const progress = Math.min(1, Math.max(0, (sourceOffset - range.startOffset) / blockLength));
  return Math.round(range.startMs + (nextStartMs - range.startMs) * progress);
}

function hasCompleteSentenceEnding(value: string): boolean {
  let normalized = normalizeSourceText(value);
  let withoutMarker = normalized.replace(/\s*(?:>>|\[[^\]]+\])\s*$/, "").trimEnd();
  while (withoutMarker !== normalized) {
    normalized = withoutMarker;
    withoutMarker = normalized.replace(/\s*(?:>>|\[[^\]]+\])\s*$/, "").trimEnd();
  }
  return /[.!?…]["'’”)}\]]*$/.test(normalized);
}

function canonicalSourceExpression(source: string, candidate: string): string | null {
  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate || trimmedCandidate.length > 1_000) return null;
  const [range] = findExpressionRanges(source, [
    {
      expressionEn: trimmedCandidate,
      meaningJa: "",
      explanationJa: "",
      exampleEn: "",
      exampleJa: "",
    },
  ]);
  return range ? source.slice(range.start, range.end) : null;
}

function allocateExpressionBudgets(weights: number[], totalBudget: number): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!weights.length || totalWeight <= 0 || totalBudget <= 0) return weights.map(() => 0);

  const allocations = weights.map((weight) => Math.floor((weight / totalWeight) * totalBudget));
  let remaining = totalBudget - allocations.reduce((sum, value) => sum + value, 0);
  const priority = weights
    .map((weight, index) => ({
      index,
      remainder: (weight / totalWeight) * totalBudget - (allocations[index] ?? 0),
    }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (const item of priority) {
    if (remaining <= 0) break;
    allocations[item.index] = (allocations[item.index] ?? 0) + 1;
    remaining -= 1;
  }
  return allocations;
}

export class YoutubeGenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeGenerationValidationError";
  }
}
