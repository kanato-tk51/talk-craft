import { describe, expect, it } from "vitest";

import {
  buildParagraphPlan,
  buildSentenceAlignedTranscriptBlocks,
  buildTranslationChunks,
  createYoutubeGenerationCheckpoint,
  mergeGeneratedYoutubeTranslation,
  mergePartialGeneratedYoutubeTranslation,
  type PlannedParagraph,
  restoreYoutubeGenerationCheckpoint,
  type TranslationChunk,
  validateChunkTranslation,
  YoutubeGenerationValidationError,
} from "./youtube-generation";
import type { TranscriptBlock } from "./youtube-material";

const sourceBlocks: TranscriptBlock[] = [
  { sequence: 1, startMs: 0, text: "Let's get down to business." },
  { sequence: 2, startMs: 5_000, text: "First, we need a clear plan." },
  { sequence: 3, startMs: 12_000, text: "Now let's look at a different example." },
  { sequence: 4, startMs: 20_000, text: "It helps us think it through." },
];

describe("YouTube AI generation planning", () => {
  it("joins caption blocks that split one English sentence", () => {
    const aligned = buildSentenceAlignedTranscriptBlocks([
      {
        sequence: 1,
        startMs: 10_000,
        text: "We get one minute, and Adam will explain why",
      },
      {
        sequence: 2,
        startMs: 20_000,
        text: "he thinks buffets are bad. Here is his first point.",
      },
    ]);

    expect(aligned.map((block) => block.text)).toEqual([
      "We get one minute, and Adam will explain why he thinks buffets are bad.",
      "Here is his first point.",
    ]);
    expect(aligned.map((block) => block.sequence)).toEqual([1, 2]);
  });

  it("reconstructs source paragraphs from end IDs without model-generated English", () => {
    expect(buildParagraphPlan(sourceBlocks, [2, 4])).toEqual([
      {
        sequence: 1,
        startBlockSequence: 1,
        endBlockSequence: 2,
        startMs: 0,
        sourceEn: "Let's get down to business. First, we need a clear plan.",
        sourceSentences: ["Let's get down to business.", "First, we need a clear plan."],
        estimatedTokens: 14,
      },
      {
        sequence: 2,
        startBlockSequence: 3,
        endBlockSequence: 4,
        startMs: 12_000,
        sourceEn: "Now let's look at a different example. It helps us think it through.",
        sourceSentences: [
          "Now let's look at a different example.",
          "It helps us think it through.",
        ],
        estimatedTokens: 17,
      },
    ]);
  });

  it("rejects missing, reordered, and incomplete paragraph boundaries", () => {
    expect(() => buildParagraphPlan(sourceBlocks, [])).toThrow(YoutubeGenerationValidationError);
    expect(() => buildParagraphPlan(sourceBlocks, [3, 2, 4])).toThrow(
      YoutubeGenerationValidationError,
    );
    expect(() => buildParagraphPlan(sourceBlocks, [2, 3])).toThrow(
      YoutubeGenerationValidationError,
    );
  });

  it("rejects an internal paragraph boundary before the sentence ending", () => {
    const midSentenceBlocks: TranscriptBlock[] = [
      { sequence: 1, startMs: 0, text: "Adam is going to explain why" },
      { sequence: 2, startMs: 5_000, text: "he thinks buffets are bad." },
    ];

    expect(() => buildParagraphPlan(midSentenceBlocks, [1, 2])).toThrow("文末ではありません");
  });

  it("creates one parallelizable chunk per paragraph and allocates twelve expressions", () => {
    const paragraphs = buildParagraphPlan(sourceBlocks, [1, 2, 3, 4]);
    const chunks = buildTranslationChunks(paragraphs);
    expect(chunks.flatMap((chunk) => chunk.paragraphs.map((item) => item.sequence))).toEqual([
      1, 2, 3, 4,
    ]);
    expect(chunks.every((chunk) => chunk.paragraphs.length === 1)).toBe(true);
    expect(chunks.reduce((sum, chunk) => sum + chunk.expressionBudget, 0)).toBe(12);
  });
});

describe("YouTube AI generation merge", () => {
  it("requires one Japanese translation line per English sentence", () => {
    const [chunk] = buildTranslationChunks(buildParagraphPlan(sourceBlocks, [2, 4]));
    if (!chunk) throw new Error("test chunk was not created");
    expect(() =>
      validateChunkTranslation(chunk, {
        t: [{ p: 1, s: 1, j: "本題に入りましょう。" }],
        x: [],
      }),
    ).toThrow("対応訳の欠落");
  });

  it("rejects reordered sentence IDs even when every translation is present", () => {
    const [chunk] = buildTranslationChunks(buildParagraphPlan(sourceBlocks, [2, 4]));
    if (!chunk) throw new Error("test chunk was not created");
    expect(() =>
      validateChunkTranslation(chunk, {
        t: [
          { p: 1, s: 2, j: "まず、明確な計画を立てる必要があります。" },
          { p: 1, s: 1, j: "本題に入りましょう。" },
        ],
        x: [],
      }),
    ).toThrow("対応訳の欠落");
  });

  it("restores source text and canonicalizes expression quotes deterministically", () => {
    const structure = { s: "計画と検討方法について説明します。", e: [2, 4], g: [] };
    const paragraphs = buildParagraphPlan(sourceBlocks, structure.e);
    const chunks = buildTranslationChunks(paragraphs);
    const firstChunk = chunks[0];
    const secondChunk = chunks[1];
    if (!firstChunk || !secondChunk) throw new Error("test chunks were not created");

    const result = mergeGeneratedYoutubeTranslation(structure, paragraphs, [
      {
        chunk: firstChunk,
        output: {
          t: [
            { p: 1, s: 1, j: "本題に入りましょう。" },
            { p: 1, s: 2, j: "まず、明確な計画を立てる必要があります。" },
          ],
          x: [],
        },
      },
      {
        chunk: secondChunk,
        output: {
          t: [
            { p: 2, s: 1, j: "では、別の例を見てみましょう。" },
            { p: 2, s: 2, j: "それは、よく考える助けになります。" },
          ],
          x: [
            {
              p: 2,
              q: "think it through",
              m: "よく考える",
              n: "結論を出す前に十分検討する表現です。",
              e: "Let's think it through.",
              j: "よく考えてみましょう。",
            },
            {
              p: 2,
              q: "not in the source",
              m: "",
              n: "",
              e: "",
              j: "",
            },
          ],
        },
      },
    ]);

    expect(result.translationBlocks[1]).toMatchObject({
      sequence: 2,
      sourceEn: "Now let's look at a different example. It helps us think it through.",
      startMs: 12_000,
      sentencePairs: [
        {
          sourceEn: "Now let's look at a different example.",
          translationJa: "では、別の例を見てみましょう。",
        },
        {
          sourceEn: "It helps us think it through.",
          translationJa: "それは、よく考える助けになります。",
        },
      ],
    });
    expect(result.keyExpressions).toHaveLength(1);
    expect(result.keyExpressions[0]?.expressionEn).toBe("think it through");
  });

  it("merges completed chunks without requiring unfinished paragraphs", () => {
    const structure = { s: "計画と検討方法について説明します。", e: [2, 4], g: [] };
    const paragraphs = buildParagraphPlan(sourceBlocks, structure.e);
    const firstChunk: TranslationChunk = {
      paragraphs: [paragraphs[0] as PlannedParagraph],
      previousContext: "",
      nextContext: paragraphs[1]?.sourceEn ?? "",
      expressionBudget: 6,
    };
    const output = {
      t: [
        { p: 1, s: 1, j: "本題に入ります。" },
        { p: 1, s: 2, j: "明確な計画を立てます。" },
      ],
      x: [],
    };

    const partial = mergePartialGeneratedYoutubeTranslation(structure, paragraphs, [
      { chunk: firstChunk, output },
    ]);

    expect(partial.translationBlocks).toHaveLength(1);
    expect(partial.translationBlocks[0]).toMatchObject({
      sequence: 1,
      translationJa: "本題に入ります。\n明確な計画を立てます。",
    });
  });

  it("restores only checkpoints that still match deterministic chunks", () => {
    const structure = { s: "計画と検討方法について説明します。", e: [2, 4], g: [] };
    const paragraphs = buildParagraphPlan(sourceBlocks, structure.e);
    const chunks = buildTranslationChunks(paragraphs);
    const output = {
      t: [
        { p: 1, s: 1, j: "本題に入ります。" },
        { p: 1, s: 2, j: "明確な計画を立てます。" },
      ],
      x: [],
    };
    const checkpoint = createYoutubeGenerationCheckpoint(structure, chunks, new Map([[0, output]]));

    const restored = restoreYoutubeGenerationCheckpoint(checkpoint, sourceBlocks);
    expect(restored?.completedChunks.get(0)).toEqual(output);

    const staleCheckpoint = {
      ...checkpoint,
      completedChunks: checkpoint.completedChunks.map((chunk) => ({
        ...chunk,
        paragraphSequences: [999],
      })),
    };
    expect(restoreYoutubeGenerationCheckpoint(staleCheckpoint, sourceBlocks)).toBeNull();
  });
});
