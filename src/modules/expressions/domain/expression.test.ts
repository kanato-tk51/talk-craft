import { describe, expect, it } from "vitest";

import { expressionInputSchema, normalizeExpression } from "./expression";

describe("expressionInputSchema", () => {
  it("accepts independent flashcard-ready expression data", () => {
    const result = expressionInputSchema.parse({
      expressionEn: "I coordinate with multiple stakeholders.",
      meaningJa: "複数の関係者と調整します",
      examples: ["I coordinate with stakeholders across three teams."],
      priority: "high",
    });

    expect(result.learningStatus).toBe("new");
    expect(result.alternativeExpressions).toEqual([]);
  });

  it("rejects empty English text", () => {
    expect(expressionInputSchema.safeParse({ expressionEn: "" }).success).toBe(false);
  });
});

describe("normalizeExpression", () => {
  it("normalizes case and whitespace for duplicate detection", () => {
    expect(normalizeExpression("  Act   as a bridge ")).toBe("act as a bridge");
  });
});
