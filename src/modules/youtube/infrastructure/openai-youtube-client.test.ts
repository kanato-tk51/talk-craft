import { describe, expect, it } from "vitest";

import type { PlannedParagraph } from "../domain/youtube-generation";
import {
  renderTranslationTarget,
  YOUTUBE_TRANSLATION_INSTRUCTIONS,
} from "../domain/youtube-translation-prompt";

describe("YouTube translation prompt", () => {
  it("assigns stable paragraph and sentence IDs to every source sentence", () => {
    const paragraph: PlannedParagraph = {
      sequence: 3,
      startBlockSequence: 5,
      endBlockSequence: 6,
      startMs: 10_000,
      sourceEn: "First sentence. Second sentence.",
      sourceSentences: ["First sentence.", "Second sentence."],
      estimatedTokens: 8,
    };

    expect(renderTranslationTarget([paragraph])).toBe(`<p id="3">
<s id="1">First sentence.</s>
<s id="2">Second sentence.</s>
</p>`);
  });

  it("requires one explicitly identified translation for each English sentence", () => {
    expect(YOUTUBE_TRANSLATION_INSTRUCTIONS).toContain(
      "この(p, s)が英語原文と日本語訳の対応を一意に表す",
    );
    expect(YOUTUBE_TRANSLATION_INSTRUCTIONS).toContain(
      "t=[{p=段落番号,s=英文番号,j=その英文だけの日本語訳}]",
    );
    expect(YOUTUBE_TRANSLATION_INSTRUCTIONS).toContain("pとsの番号を変更、省略、重複させない");
  });
});
