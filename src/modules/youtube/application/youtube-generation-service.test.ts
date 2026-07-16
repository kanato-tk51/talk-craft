import { describe, expect, it, vi } from "vitest";

import type { CompactTranslationOutput, TranslationChunk } from "../domain/youtube-generation";
import { runTranslationChunksWithCheckpoints } from "./youtube-generation-runner";

const chunks: TranslationChunk[] = [1, 2, 3].map((sequence) => ({
  paragraphs: [
    {
      sequence,
      startBlockSequence: sequence,
      endBlockSequence: sequence,
      startMs: sequence * 1_000,
      sourceEn: `Source ${sequence}.`,
      sourceSentences: [`Source ${sequence}.`],
      estimatedTokens: 3,
    },
  ],
  previousContext: "",
  nextContext: "",
  expressionBudget: 1,
}));

function outputFor(sequence: number): CompactTranslationOutput {
  return { t: [{ p: sequence, j: `訳${sequence}` }], x: [] };
}

describe("YouTube generation checkpoints", () => {
  it("persists completed chunks before a later chunk fails", async () => {
    const persisted: number[][] = [];
    const generateChunk = vi.fn(async (_chunk: TranslationChunk, index: number) => {
      if (index === 1) throw new Error("translation failed");
      return outputFor(index + 1);
    });

    await expect(
      runTranslationChunksWithCheckpoints(
        chunks,
        new Map(),
        generateChunk,
        async (results) => {
          persisted.push([...results.keys()]);
        },
        1,
      ),
    ).rejects.toThrow("translation failed");

    expect(generateChunk.mock.calls.map((call) => call[1])).toEqual([0, 1]);
    expect(persisted).toEqual([[0]]);
  });

  it("skips completed chunks when resuming from a checkpoint", async () => {
    const generateChunk = vi.fn(async (_chunk: TranslationChunk, index: number) =>
      outputFor(index + 1),
    );
    const persisted: number[][] = [];

    const results = await runTranslationChunksWithCheckpoints(
      chunks.slice(0, 2),
      new Map([[0, outputFor(1)]]),
      generateChunk,
      async (snapshot) => {
        persisted.push([...snapshot.keys()]);
      },
      1,
    );

    expect(generateChunk.mock.calls.map((call) => call[1])).toEqual([1]);
    expect(persisted).toEqual([[0, 1]]);
    expect([...results.keys()]).toEqual([0, 1]);
  });
});
