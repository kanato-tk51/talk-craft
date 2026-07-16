import { describe, expect, it } from "vitest";
import { findExpressionRanges } from "./expression-annotations";
import type { KeyExpression } from "./youtube-material";

function expression(expressionEn: string): KeyExpression {
  return {
    expressionEn,
    meaningJa: "意味",
    explanationJa: "説明",
    exampleEn: "Example.",
    exampleJa: "例文。",
  };
}

describe("findExpressionRanges", () => {
  it("finds expressions without depending on case or whitespace width", () => {
    const text = "We need to THINK   IT THROUGH before deciding.";
    expect(findExpressionRanges(text, [expression("think it through")])).toEqual([
      { start: 11, end: 29, expressionIndex: 0 },
    ]);
  });

  it("matches typographic apostrophes and dashes", () => {
    const text = "Let’s use a long–term plan.";
    expect(findExpressionRanges(text, [expression("Let's"), expression("long-term")])).toEqual([
      { start: 0, end: 5, expressionIndex: 0 },
      { start: 12, end: 21, expressionIndex: 1 },
    ]);
  });

  it("prefers a longer expression when matches overlap", () => {
    const text = "Let's get down to business.";
    expect(
      findExpressionRanges(text, [expression("get down"), expression("get down to business")]),
    ).toEqual([{ start: 6, end: 26, expressionIndex: 1 }]);
  });

  it("returns every non-overlapping occurrence", () => {
    const text = "work out, then work out.";
    expect(findExpressionRanges(text, [expression("work out")])).toEqual([
      { start: 0, end: 8, expressionIndex: 0 },
      { start: 15, end: 23, expressionIndex: 0 },
    ]);
  });
});
