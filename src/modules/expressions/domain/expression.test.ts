import { describe, expect, it } from "vitest";

import { expressionIdSchema, expressionInputSchema, normalizeExpression } from "./expression";

describe("expressionIdSchema", () => {
  it("accepts UUIDs and rejects SQL-like input", () => {
    expect(expressionIdSchema.safeParse("00000000-0000-4000-8000-000000000001").success).toBe(true);
    expect(expressionIdSchema.safeParse("' OR 1=1; DROP TABLE expressions; --").success).toBe(
      false,
    );
  });
});

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
