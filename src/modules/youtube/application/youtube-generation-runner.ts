import type { CompactTranslationOutput, TranslationChunk } from "../domain/youtube-generation";

export async function runTranslationChunksWithCheckpoints(
  chunks: TranslationChunk[],
  initialResults: ReadonlyMap<number, CompactTranslationOutput>,
  generateChunk: (chunk: TranslationChunk, index: number) => Promise<CompactTranslationOutput>,
  persistProgress: (results: ReadonlyMap<number, CompactTranslationOutput>) => Promise<void>,
  concurrency: number,
): Promise<Map<number, CompactTranslationOutput>> {
  const results = new Map(initialResults);
  const pendingIndexes = chunks.map((_, index) => index).filter((index) => !results.has(index));
  let nextIndex = 0;
  let firstError: unknown;
  let checkpointQueue = Promise.resolve();

  function queueCheckpoint() {
    const snapshot = new Map(results);
    const pendingWrite = checkpointQueue.then(() => persistProgress(snapshot));
    checkpointQueue = pendingWrite;
    return pendingWrite;
  }

  async function runWorker() {
    while (nextIndex < pendingIndexes.length && !firstError) {
      const pendingIndex = nextIndex;
      nextIndex += 1;
      const chunkIndex = pendingIndexes[pendingIndex];
      if (chunkIndex === undefined) continue;
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;

      try {
        const output = await generateChunk(chunk, chunkIndex);
        results.set(chunkIndex, output);
        await queueCheckpoint();
      } catch (error) {
        firstError ??= error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pendingIndexes.length) }, () => runWorker()),
  );
  if (firstError) throw firstError;
  return results;
}
